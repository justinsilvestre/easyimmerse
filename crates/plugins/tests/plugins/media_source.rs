use std::path::Path;

use crate::support::FixtureServer;
use easyimmerse_plugins::{
    CapabilityGrants, CompiledPlugin, HostLimits, MediaSourceFixturePlugin, MediaSourcePlugin,
    PluginErrorKind, PluginPackage,
};

/// The fixture plugin compiled once, with a server for it to fetch from and a directory
/// granted to it.
struct Fixture {
    server: FixtureServer,
    output_dir: tempfile::TempDir,
    compiled: CompiledPlugin,
    grants: CapabilityGrants,
}

impl Fixture {
    fn start() -> Self {
        let server = crate::support::start_fixture_http_server();
        let output_dir = tempfile::tempdir().expect("create a temp dir");
        let package =
            PluginPackage::open(&crate::support::built_plugin_dir("fixture-media-source"))
                .expect("open the package");
        let grants = CapabilityGrants {
            allowed_hosts: package.manifest.allowed_hosts.clone(),
            granted_dirs: vec![output_dir.path().to_path_buf()],
            bundled_bin_dir: package
                .bin_dir
                .clone()
                .or_else(|| crate::support::source_bin_dir("fixture-media-source")),
            ..CapabilityGrants::default()
        };
        let compiled = CompiledPlugin::compile(&package, crate::support::execution_mode())
            .expect("compile the plugin");
        Self {
            server,
            output_dir,
            compiled,
            grants,
        }
    }

    /// The component through its `media-source` export, as the app loads it.
    fn media_source(&self) -> MediaSourcePlugin {
        MediaSourcePlugin::instantiate(&self.compiled, self.grants.clone(), HostLimits::default())
            .expect("instantiate the plugin")
    }

    /// The component through its test-only `sandbox-probe` export.
    fn probe(&self) -> MediaSourceFixturePlugin {
        MediaSourceFixturePlugin::instantiate(
            &self.compiled,
            self.grants.clone(),
            HostLimits::default(),
        )
        .expect("instantiate the plugin")
    }

    fn locator(&self) -> String {
        format!("{}/sample", self.server.base_url)
    }

    fn output_path(&self, file_name: &str) -> String {
        self.output_dir
            .path()
            .join(file_name)
            .to_string_lossy()
            .into_owned()
    }
}

#[cfg(windows)]
const UNBUNDLED_COMMAND: &str = "cmd";
#[cfg(not(windows))]
const UNBUNDLED_COMMAND: &str = "ls";

#[test]
fn refuses_to_run_a_command_that_is_not_bundled() {
    let fixture = Fixture::start();
    let outcome = fixture
        .probe()
        .probe_run(UNBUNDLED_COMMAND)
        .expect("the call completes");
    assert!(
        matches!(outcome, Err(PluginErrorKind::NotPermitted(_))),
        "got {outcome:?}"
    );
}

#[test]
fn refuses_to_fetch_from_a_host_that_is_not_allowed() {
    let fixture = Fixture::start();
    let outcome = fixture
        .probe()
        .probe_get("http://example.com/")
        .expect("the call completes");
    assert!(
        matches!(outcome, Err(PluginErrorKind::NotPermitted(_))),
        "got {outcome:?}"
    );
}

#[test]
fn reports_progress_while_resolving() {
    let fixture = Fixture::start();
    let (locator, output_dir) = (fixture.locator(), fixture.output_path(""));
    let (_, progress) = fixture
        .media_source()
        .resolve(&locator, &output_dir)
        .expect("resolve");
    assert!(progress.len() >= 2, "got {progress:?}");
}

#[test]
fn writes_the_media_and_subtitles_into_the_granted_dir() {
    let fixture = Fixture::start();
    let (locator, output_dir) = (fixture.locator(), fixture.output_path(""));
    fixture
        .media_source()
        .resolve(&locator, &output_dir)
        .expect("resolve");
    assert!(
        files_match(
            &fixture.output_path("media.mp4"),
            &crate::support::fixtures_dir().join("sample.mp4")
        ) && files_match(
            &fixture.output_path("subtitles.srt"),
            &crate::support::fixtures_dir().join("sample.srt")
        )
    );
}

#[test]
fn reports_the_language_of_each_subtitle_file() {
    let fixture = Fixture::start();
    let (locator, output_dir) = (fixture.locator(), fixture.output_path(""));
    let (resolved, _) = fixture
        .media_source()
        .resolve(&locator, &output_dir)
        .expect("resolve");
    let languages: Vec<_> = resolved
        .subtitles
        .iter()
        .map(|subtitle| subtitle.language.as_deref())
        .collect();
    assert_eq!(languages, vec![Some("en")]);
}

fn files_match(written: &str, fixture: &Path) -> bool {
    std::fs::read(written).expect("read the written file")
        == std::fs::read(fixture).expect("read the fixture")
}
