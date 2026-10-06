//! The proof-of-concept YouTube plugin, run against a stand-in for yt-dlp that answers
//! offline with the repository's sample video and subtitles.

use std::path::{Path, PathBuf};

use easyimmerse_plugins::{
    CapabilityGrants, HostLimits, MediaSourcePlugin, PluginError, PluginErrorKind, PluginPackage,
};

const PLUGIN: &str = "youtube-media-source";
const VIDEO_ID: &str = "abc123def45";

struct Fixture {
    output_dir: tempfile::TempDir,
    plugin: MediaSourcePlugin,
}

impl Fixture {
    fn start() -> Self {
        let output_dir = tempfile::tempdir().expect("create a temp dir");
        let package = PluginPackage::open(&crate::support::built_plugin_dir(PLUGIN))
            .expect("open the package");
        let grants = CapabilityGrants {
            granted_dirs: vec![output_dir.path().to_path_buf()],
            bundled_bin_dir: Some(stand_in_bin_dir()),
            ..CapabilityGrants::default()
        };
        let limits = HostLimits {
            fuel: 2_000_000_000,
            ..HostLimits::default()
        };
        let plugin =
            MediaSourcePlugin::load(&package, grants, crate::support::execution_mode(), limits)
                .expect("load the plugin");
        Self { output_dir, plugin }
    }

    fn resolve(
        &mut self,
        locator: &str,
    ) -> Result<easyimmerse_core::providers::media_source::ResolvedMedia, PluginError> {
        let output_dir = self.output_dir.path().to_string_lossy().into_owned();
        self.plugin
            .resolve(locator, &output_dir)
            .map(|(resolved, _progress)| resolved)
    }

    fn output_path(&self, file_name: &str) -> PathBuf {
        self.output_dir.path().join(file_name)
    }
}

/// The directory holding the `youtube` script that stands in for yt-dlp.
fn stand_in_bin_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../plugins")
        .join(PLUGIN)
        .join("test-bin")
}

#[test]
fn hands_a_bare_video_id_to_the_tool_as_a_watch_url() {
    let mut fixture = Fixture::start();
    let resolved = fixture.resolve(VIDEO_ID).expect("resolve");
    assert_eq!(
        resolved.title,
        format!("Video https://www.youtube.com/watch?v={VIDEO_ID}")
    );
}

#[test]
fn hands_a_url_to_the_tool_as_given() {
    let mut fixture = Fixture::start();
    let resolved = fixture
        .resolve(&format!("https://youtu.be/{VIDEO_ID}"))
        .expect("resolve");
    assert_eq!(resolved.title, format!("Video https://youtu.be/{VIDEO_ID}"));
}

#[test]
fn refuses_a_locator_that_is_neither_a_url_nor_a_video_id() {
    let mut fixture = Fixture::start();
    let error = fixture.resolve("not a video").unwrap_err();
    assert!(
        matches!(error, PluginError::Plugin(PluginErrorKind::InvalidInput(_))),
        "got {error:?}"
    );
}

#[test]
fn downloads_the_video_into_the_output_dir() {
    let mut fixture = Fixture::start();
    let resolved = fixture.resolve(VIDEO_ID).expect("resolve");
    assert_eq!(
        Path::new(&resolved.media_path),
        fixture.output_path("media.mp4")
    );
}

#[test]
fn reports_the_duration_in_milliseconds() {
    let mut fixture = Fixture::start();
    let resolved = fixture.resolve(VIDEO_ID).expect("resolve");
    assert_eq!(resolved.duration_ms, Some(12_500));
}

#[test]
fn fetches_the_uploaders_subtitles_and_the_original_automatic_captions() {
    let mut fixture = Fixture::start();
    let resolved = fixture.resolve(VIDEO_ID).expect("resolve");
    let languages: Vec<_> = resolved
        .subtitles
        .iter()
        .map(|subtitle| subtitle.language.as_deref())
        .collect();
    assert_eq!(languages, vec![Some("en"), Some("es")]);
}

#[test]
fn names_the_subtitle_files_the_tool_wrote() {
    let mut fixture = Fixture::start();
    let resolved = fixture.resolve(VIDEO_ID).expect("resolve");
    let paths: Vec<_> = resolved
        .subtitles
        .iter()
        .map(|subtitle| PathBuf::from(&subtitle.path))
        .collect();
    assert_eq!(
        paths,
        vec![
            fixture.output_path("media.en.vtt"),
            fixture.output_path("media.es-orig.vtt")
        ]
    );
}

#[test]
fn passes_on_the_tools_error_for_a_video_it_cannot_fetch() {
    let mut fixture = Fixture::start();
    let error = fixture
        .resolve("https://www.youtube.com/watch?v=unavailable")
        .unwrap_err();
    match error {
        PluginError::Plugin(PluginErrorKind::Other(message)) => {
            assert!(message.contains("Video unavailable"), "{message}")
        }
        other => panic!("got {other:?}"),
    }
}
