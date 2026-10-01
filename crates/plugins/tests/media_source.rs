mod support;

use std::path::Path;

use easyimmerse_plugins::{
    CapabilityGrants, HostLimits, MediaSourcePlugin, PluginErrorKind, PluginPackage,
};
use support::FixtureServer;

struct Fixture {
    server: FixtureServer,
    output_dir: tempfile::TempDir,
    plugin: MediaSourcePlugin,
}

impl Fixture {
    fn start() -> Self {
        let server = support::start_fixture_http_server();
        let output_dir = tempfile::tempdir().expect("create a temp dir");
        let package = PluginPackage::open(&support::built_plugin_dir("fixture-media-source"))
            .expect("open the package");
        let grants = CapabilityGrants {
            allowed_hosts: package.manifest.allowed_hosts.clone(),
            granted_dirs: vec![output_dir.path().to_path_buf()],
            bundled_bin_dir: package
                .bin_dir
                .clone()
                .or_else(|| support::source_bin_dir("fixture-media-source")),
            ..CapabilityGrants::default()
        };
        let plugin = MediaSourcePlugin::load(
            &package,
            grants,
            support::execution_mode(),
            HostLimits::default(),
        )
        .expect("load the plugin");
        Self {
            server,
            output_dir,
            plugin,
        }
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
    let mut fixture = Fixture::start();
    let outcome = fixture
        .plugin
        .probe_run(UNBUNDLED_COMMAND)
        .expect("the call completes");
    assert!(
        matches!(outcome, Err(PluginErrorKind::NotPermitted(_))),
        "got {outcome:?}"
    );
}

#[test]
fn refuses_to_fetch_from_a_host_that_is_not_allowed() {
    let mut fixture = Fixture::start();
    let outcome = fixture
        .plugin
        .probe_get("http://example.com/")
        .expect("the call completes");
    assert!(
        matches!(outcome, Err(PluginErrorKind::NotPermitted(_))),
        "got {outcome:?}"
    );
}

#[test]
fn reports_progress_while_resolving() {
    let mut fixture = Fixture::start();
    let (locator, output_dir) = (fixture.locator(), fixture.output_path(""));
    let (_, progress) = fixture
        .plugin
        .resolve(&locator, &output_dir)
        .expect("resolve");
    assert!(progress.len() >= 2, "got {progress:?}");
}

#[test]
fn writes_the_media_and_subtitles_into_the_granted_dir() {
    let mut fixture = Fixture::start();
    let (locator, output_dir) = (fixture.locator(), fixture.output_path(""));
    fixture
        .plugin
        .resolve(&locator, &output_dir)
        .expect("resolve");
    assert!(
        files_match(
            &fixture.output_path("media.mp4"),
            &support::fixtures_dir().join("sample.mp4")
        ) && files_match(
            &fixture.output_path("subtitles.srt"),
            &support::fixtures_dir().join("sample.srt")
        )
    );
}

fn files_match(written: &str, fixture: &Path) -> bool {
    std::fs::read(written).expect("read the written file")
        == std::fs::read(fixture).expect("read the fixture")
}
