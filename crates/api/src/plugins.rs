//! The plugins installed in the server's plugin directory, and how the server runs one.

use std::path::{Path, PathBuf};

use easyimmerse_core::providers::media_source::ResolvedMedia;
use easyimmerse_plugins::{
    CapabilityGrants, ExecutionMode, HostEvent, HostLimits, MediaSourcePlugin, PluginError,
    PluginKind, PluginPackage,
};

/// The instruction budget of one `resolve` call. A media-source plugin spends its own
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

/// Runs the plugin's `resolve` on the current thread, granting it `output_dir` to write
/// into, the hosts its manifest lists, and the executables it bundles. The listener hears
/// what the plugin and its commands report as it happens; the host logs it as well.
pub fn resolve_media(
    package: &PluginPackage,
    locator: &str,
    output_dir: &Path,
    listener: impl FnMut(HostEvent) + Send + 'static,
) -> Result<ResolvedMedia, PluginError> {
    let grants = CapabilityGrants {
        allowed_hosts: package.manifest.allowed_hosts.clone(),
        granted_dirs: vec![output_dir.to_path_buf()],
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
    let mut plugin = MediaSourcePlugin::load(package, grants, mode, limits)?;
    plugin.listen(listener);
    let (resolved, _progress) = plugin.resolve(locator, &output_dir.to_string_lossy())?;
    Ok(resolved)
}

/// The directory a plugin fetched `path` into, when `path` lies in one: the media directory
/// holds one directory per plugin, and each of those one directory per fetched item.
/// Returns `None` for a path anywhere else, so that nothing outside is ever removed.
pub fn fetched_item_dir(media_dir: &Path, path: &str) -> Option<PathBuf> {
    let media_dir = media_dir.canonicalize().ok()?;
    let path = Path::new(path).canonicalize().ok()?;
    let item_dir = path.parent()?;
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
            Some(item_dir.canonicalize().unwrap())
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
