//! The plugins installed in the server's plugin directory, and how the server runs one.

use std::path::{Path, PathBuf};

use easyimmerse_core::providers::media_source::{ResolvedMedia, ResolvedSubtitle};
use easyimmerse_core::providers::plugin_form::{FormInput, PluginForm};
use easyimmerse_plugins::{
    CapabilityGrants, ExecutionMode, FetchRequest, HostEvent, HostLimits, ImportAnswer,
    ImportContext, ImportRequest, MediaAnswer, MediaContext, MediaSourcePlugin, PluginError,
    PluginKind, PluginPackage,
};

use crate::plugin_compile_cache::compiled_plugin;

/// The instruction budget of one call. A media-source plugin spends its own
/// instructions on parsing what its tools print, while the host does the fetching, so the
/// budget is far above the default per-call one without letting a loop run forever.
const MEDIA_SOURCE_FUEL: u64 = 2_000_000_000;

/// The plugin packages found in the plugin directory when the server started.
#[derive(Debug, Clone, Default)]
pub struct PluginRegistry {
    packages: Vec<PluginPackage>,
}

impl PluginRegistry {
    /// Opens every package in the immediate subdirectories of `dir`, in name order. A missing
    /// directory holds no plugins; a package that cannot be opened is skipped with a warning.
    pub fn scan(dir: &Path) -> Self {
        let mut packages = Vec::new();
        for package_dir in package_dirs(dir) {
            match PluginPackage::open(&package_dir) {
                Ok(package) => packages.push(package),
                Err(error) => {
                    tracing::warn!("skipping the plugin at {}: {error}", package_dir.display())
                }
            }
        }
        Self { packages }
    }

    pub fn packages(&self) -> &[PluginPackage] {
        &self.packages
    }

    /// The media-source plugin called `name`, if one is installed.
    pub fn media_source(&self, name: &str) -> Option<&PluginPackage> {
        self.packages.iter().find(|package| {
            package.manifest.kind == PluginKind::MediaSource && package.manifest.name == name
        })
    }
}

fn package_dirs(dir: &Path) -> Vec<PathBuf> {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return Vec::new();
    };
    let mut dirs: Vec<PathBuf> = entries
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.join("plugin.toml").is_file())
        .collect();
    dirs.sort();
    dirs
}

/// The first form of the plugin's import interface. The plugin is granted no directory,
/// since showing a form fetches nothing; the same holds for the other form calls.
pub fn import_form(
    package: &PluginPackage,
    context: &ImportContext,
) -> Result<PluginForm, PluginError> {
    load_plugin(package, &[])?.import_form(context)
}

/// The plugin's answer to an action in its import interface.
pub fn import_step(
    package: &PluginPackage,
    context: &ImportContext,
    action: &str,
    input: &[FormInput],
) -> Result<ImportAnswer, PluginError> {
    load_plugin(package, &[])?.import_step(context, action, input)
}

/// Runs the plugin's `import` on the current thread, granting it `output_dir` to write
/// into, the hosts its manifest lists, and the executables it bundles. The listener hears
/// what the plugin and its commands report as it happens; the host logs it as well.
pub fn run_import(
    package: &PluginPackage,
    request: &ImportRequest,
    output_dir: &Path,
    listener: impl FnMut(HostEvent) + Send + 'static,
) -> Result<ResolvedMedia, PluginError> {
    let mut plugin = load_plugin(package, &[output_dir.to_path_buf()])?;
    plugin.listen(listener);
    let (resolved, _progress) = plugin.import(request, &output_dir.to_string_lossy())?;
    Ok(resolved)
}

/// The first form of the plugin's media interface for a media file imported through it.
pub fn media_form(
    package: &PluginPackage,
    context: &MediaContext,
) -> Result<PluginForm, PluginError> {
    load_plugin(package, &[])?.media_form(context)
}

/// The plugin's answer to an action in its media interface.
pub fn media_step(
    package: &PluginPackage,
    context: &MediaContext,
    action: &str,
    input: &[FormInput],
) -> Result<MediaAnswer, PluginError> {
    load_plugin(package, &[])?.media_step(context, action, input)
}

/// Runs the plugin's `fetch-subtitles` on the current thread, granting it `output_dir`
/// to write into.
pub fn fetch_subtitles(
    package: &PluginPackage,
    request: &FetchRequest,
    output_dir: &Path,
) -> Result<Vec<ResolvedSubtitle>, PluginError> {
    load_plugin(package, &[output_dir.to_path_buf()])?
        .fetch_subtitles(request, &output_dir.to_string_lossy())
}

/// Instantiates the plugin with the hosts its manifest lists, the executables it bundles,
/// and `granted_dirs` to write into. The component is compiled on the plugin's first call
/// and reused by later ones.
fn load_plugin(
    package: &PluginPackage,
    granted_dirs: &[PathBuf],
) -> Result<MediaSourcePlugin, PluginError> {
    let grants = CapabilityGrants {
        allowed_hosts: package.manifest.allowed_hosts.clone(),
        granted_dirs: granted_dirs.to_vec(),
        bundled_bin_dir: package.bin_dir.clone(),
        ..CapabilityGrants::default()
    };
    let limits = HostLimits {
        fuel: MEDIA_SOURCE_FUEL,
        ..HostLimits::default()
    };
    let mode = ExecutionMode::from_env();
    tracing::debug!(
        plugin = package.manifest.name,
        version = package.manifest.version,
        mode = mode.name(),
        "loading the plugin"
    );
    let compiled = compiled_plugin(package, mode)?;
    MediaSourcePlugin::instantiate(&compiled, grants, limits)
}

/// The directory a plugin fetched `path` into, when `path` lies in one: the media directory
/// holds one directory per plugin, and each of those one directory per fetched item.
/// Returns `None` for a path anywhere else, so that nothing outside is ever removed.
/// Both `media_dir` and `path` must be canonical, as the server stores them.
pub fn fetched_item_dir(media_dir: &Path, path: &str) -> Option<PathBuf> {
    let item_dir = Path::new(path).parent()?;
    let plugin_dir = item_dir.parent()?;
    (plugin_dir.parent()? == media_dir).then(|| item_dir.to_path_buf())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write(path: &Path, contents: &str) {
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(path, contents).unwrap();
    }

    #[test]
    fn holds_no_plugins_for_a_missing_dir() {
        let registry = PluginRegistry::scan(Path::new("/nonexistent/plugins"));
        assert!(registry.packages().is_empty());
    }

    #[test]
    fn skips_a_package_whose_component_is_missing() {
        let dir = tempfile::tempdir().unwrap();
        write(
            &dir.path().join("broken").join("plugin.toml"),
            "name = \"broken\"\nversion = \"0.1.0\"\nkind = \"hello\"\ninterface_version = \"0.1.0\"\n",
        );
        let registry = PluginRegistry::scan(dir.path());
        assert!(registry.packages().is_empty());
    }

    #[test]
    fn finds_a_media_source_plugin_by_name() {
        let dir = tempfile::tempdir().unwrap();
        write(
            &dir.path().join("source").join("plugin.toml"),
            "name = \"source\"\nversion = \"0.1.0\"\nkind = \"media-source\"\ninterface_version = \"0.1.0\"\n",
        );
        write(&dir.path().join("source").join("plugin.wasm"), "");
        let registry = PluginRegistry::scan(dir.path());
        assert!(registry.media_source("source").is_some());
    }

    #[test]
    fn does_not_find_a_plugin_of_another_kind_by_name() {
        let dir = tempfile::tempdir().unwrap();
        write(
            &dir.path().join("hello").join("plugin.toml"),
            "name = \"hello\"\nversion = \"0.1.0\"\nkind = \"hello\"\ninterface_version = \"0.1.0\"\n",
        );
        write(&dir.path().join("hello").join("plugin.wasm"), "");
        let registry = PluginRegistry::scan(dir.path());
        assert!(registry.media_source("hello").is_none());
    }

    #[test]
    fn finds_the_item_dir_of_a_fetched_file() {
        let media_dir = tempfile::tempdir().unwrap();
        let item_dir = media_dir.path().join("source").join("item");
        let file = item_dir.join("media.mp4");
        write(&file, "");
        assert_eq!(
            fetched_item_dir(media_dir.path(), &file.to_string_lossy()),
            Some(item_dir)
        );
    }

    #[test]
    fn finds_no_item_dir_for_a_file_outside_the_media_dir() {
        let media_dir = tempfile::tempdir().unwrap();
        let other = tempfile::tempdir().unwrap();
        let file = other.path().join("source").join("item").join("media.mp4");
        write(&file, "");
        assert_eq!(
            fetched_item_dir(media_dir.path(), &file.to_string_lossy()),
            None
        );
    }

    #[test]
    fn finds_no_item_dir_for_a_file_directly_under_the_media_dir() {
        let media_dir = tempfile::tempdir().unwrap();
        let file = media_dir.path().join("media.mp4");
        write(&file, "");
        assert_eq!(
            fetched_item_dir(media_dir.path(), &file.to_string_lossy()),
            None
        );
    }
}
