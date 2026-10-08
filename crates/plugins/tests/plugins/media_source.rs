use std::path::Path;
use std::sync::{Arc, Mutex};

use crate::support::FixtureServer;
use easyimmerse_core::providers::plugin_form::{FormControl, FormInput, PluginForm};
use easyimmerse_plugins::{
    CapabilityGrants, CompiledPlugin, FetchRequest, HeldSubtitle, HostEvent, HostLimits,
    ImportAnswer, ImportContext, ImportRequest, MediaAnswer, MediaContext,
    MediaSourceFixturePlugin, MediaSourcePlugin, MediaUpdate, PluginError, PluginErrorKind,
    PluginPackage,
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

    /// An import of the sample locator with the given subtitle tracks.
    fn import_request(&self, subtitles: &[&str]) -> ImportRequest {
        ImportRequest {
            locator: self.locator(),
            input: vec![input("subtitles", subtitles)],
            subtitles: strings(subtitles),
        }
    }

    /// A fetch of the sample locator's subtitle tracks with the given ids.
    fn fetch_request(&self, ids: &[&str]) -> FetchRequest {
        FetchRequest {
            locator: self.locator(),
            input: vec![input("fetch", ids)],
            subtitles: strings(ids),
        }
    }

    fn media_context(&self, held: &[(&str, &str)]) -> MediaContext {
        let subtitles = held
            .iter()
            .map(|(id, name)| HeldSubtitle {
                id: id.to_string(),
                name: name.to_string(),
            })
            .collect();
        MediaContext {
            locator: self.locator(),
            languages: languages(),
            subtitles,
        }
    }
}

fn input(field: &str, values: &[&str]) -> FormInput {
    FormInput {
        field: field.to_string(),
        values: strings(values),
    }
}

fn strings(values: &[&str]) -> Vec<String> {
    values.iter().map(|value| value.to_string()).collect()
}

fn languages() -> Vec<String> {
    vec!["ja".to_string(), "en".to_string()]
}

fn import_context() -> ImportContext {
    ImportContext {
        languages: languages(),
    }
}

/// The option ids of the choice field `field` in `form`.
fn option_ids(form: &PluginForm, field: &str) -> Vec<String> {
    let control = form.fields.iter().find(|candidate| candidate.id == field);
    match control.map(|field| &field.control) {
        Some(FormControl::ChooseMany { options, .. }) => {
            options.iter().map(|option| option.id.clone()).collect()
        }
        other => panic!("no choice field {field:?}: {other:?}"),
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
fn offers_a_locator_field_in_the_import_form() {
    let fixture = Fixture::start();
    let form = fixture
        .media_source()
        .import_form(&import_context())
        .expect("import form");
    let fields: Vec<_> = form.fields.iter().map(|field| field.id.as_str()).collect();
    assert_eq!(fields, vec!["locator"]);
}

#[test]
fn answers_the_import_action_with_the_import_to_run() {
    let fixture = Fixture::start();
    let entered = vec![input("locator", &["sample"])];
    let answer = fixture
        .media_source()
        .import_step(&import_context(), "import", &entered)
        .expect("import step");
    let expected = ImportRequest {
        locator: "sample".to_string(),
        input: entered,
        subtitles: Vec::new(),
    };
    assert_eq!(answer, ImportAnswer::Import(expected));
}

#[test]
fn names_the_subtitle_tracks_an_import_will_fetch() {
    let fixture = Fixture::start();
    let entered = vec![input("locator", &["sample"]), input("subtitles", &["en"])];
    let answer = fixture
        .media_source()
        .import_step(&import_context(), "import", &entered)
        .expect("import step");
    let ImportAnswer::Import(request) = answer else {
        panic!("expected an import, got {answer:?}");
    };
    assert_eq!(request.subtitles, vec!["en".to_string()]);
}

#[test]
fn refuses_an_import_step_without_a_locator() {
    let fixture = Fixture::start();
    let outcome =
        fixture
            .media_source()
            .import_step(&import_context(), "import", &[input("locator", &[""])]);
    assert!(
        matches!(
            outcome,
            Err(PluginError::Plugin(PluginErrorKind::InvalidInput(_)))
        ),
        "got {outcome:?}"
    );
}

#[test]
fn reports_progress_while_importing() {
    let fixture = Fixture::start();
    let (request, output_dir) = (fixture.import_request(&["en"]), fixture.output_path(""));
    let (_, progress) = fixture
        .media_source()
        .import(&request, &output_dir)
        .expect("import");
    assert!(progress.len() >= 2, "got {progress:?}");
}

#[test]
fn writes_the_media_and_subtitles_into_the_granted_dir() {
    let fixture = Fixture::start();
    let (request, output_dir) = (fixture.import_request(&["en"]), fixture.output_path(""));
    fixture
        .media_source()
        .import(&request, &output_dir)
        .expect("import");
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
fn imports_the_title_the_source_gives() {
    let fixture = Fixture::start();
    let (request, output_dir) = (fixture.import_request(&[]), fixture.output_path(""));
    let (resolved, _) = fixture
        .media_source()
        .import(&request, &output_dir)
        .expect("import");
    assert_eq!(resolved.title, "Fixture");
}

#[test]
fn imports_no_subtitles_when_none_are_chosen() {
    let fixture = Fixture::start();
    let (request, output_dir) = (fixture.import_request(&[]), fixture.output_path(""));
    let (resolved, _) = fixture
        .media_source()
        .import(&request, &output_dir)
        .expect("import");
    assert!(
        resolved.subtitles.is_empty(),
        "got {:?}",
        resolved.subtitles
    );
}

#[test]
fn reports_the_language_of_each_subtitle_file() {
    let fixture = Fixture::start();
    let (request, output_dir) = (fixture.import_request(&["en"]), fixture.output_path(""));
    let (resolved, _) = fixture
        .media_source()
        .import(&request, &output_dir)
        .expect("import");
    let languages: Vec<_> = resolved
        .subtitles
        .iter()
        .map(|subtitle| subtitle.language.as_deref())
        .collect();
    assert_eq!(languages, vec![Some("en")]);
}

#[test]
fn offers_a_track_that_is_not_held_in_the_media_form() {
    let fixture = Fixture::start();
    let form = fixture
        .media_source()
        .media_form(&fixture.media_context(&[]))
        .expect("media form");
    assert_eq!(option_ids(&form, "fetch"), vec!["en"]);
}

#[test]
fn offers_no_track_that_is_held_in_the_media_form() {
    let fixture = Fixture::start();
    let form = fixture
        .media_source()
        .media_form(&fixture.media_context(&[("track-1", "English")]))
        .expect("media form");
    assert!(option_ids(&form, "fetch").is_empty());
}

#[test]
fn lists_the_held_tracks_for_removal_in_the_media_form() {
    let fixture = Fixture::start();
    let form = fixture
        .media_source()
        .media_form(&fixture.media_context(&[("track-1", "English")]))
        .expect("media form");
    assert_eq!(option_ids(&form, "remove"), vec!["track-1"]);
}

#[test]
fn answers_the_apply_action_with_the_update_to_apply() {
    let fixture = Fixture::start();
    let entered = vec![input("fetch", &["en"]), input("remove", &["track-1"])];
    let answer = fixture
        .media_source()
        .media_step(&fixture.media_context(&[]), "apply", &entered)
        .expect("media step");
    let expected = MediaUpdate {
        remove_subtitles: vec!["track-1".to_string()],
        fetch: Some(FetchRequest {
            locator: fixture.locator(),
            input: entered,
            subtitles: vec!["en".to_string()],
        }),
    };
    assert_eq!(answer, MediaAnswer::Apply(expected));
}

#[test]
fn fetches_subtitles_on_their_own() {
    let fixture = Fixture::start();
    let (request, output_dir) = (fixture.fetch_request(&["en"]), fixture.output_path(""));
    let fetched = fixture
        .media_source()
        .fetch_subtitles(&request, &output_dir)
        .expect("fetch subtitles");
    assert!(
        files_match(
            &fetched[0].path,
            &crate::support::fixtures_dir().join("sample.srt")
        ),
        "got {fetched:?}"
    );
}

#[test]
fn refuses_to_fetch_a_subtitle_track_the_source_does_not_offer() {
    let fixture = Fixture::start();
    let (request, output_dir) = (fixture.fetch_request(&["xx"]), fixture.output_path(""));
    let outcome = fixture
        .media_source()
        .fetch_subtitles(&request, &output_dir);
    assert!(
        matches!(
            outcome,
            Err(PluginError::Plugin(PluginErrorKind::NotFound(_)))
        ),
        "got {outcome:?}"
    );
}

#[test]
fn shows_forms_without_writing_anything() {
    let fixture = Fixture::start();
    let mut plugin = fixture.media_source();
    plugin.import_form(&import_context()).expect("import form");
    plugin
        .media_form(&fixture.media_context(&[]))
        .expect("media form");
    let written = std::fs::read_dir(fixture.output_dir.path())
        .expect("read the output dir")
        .count();
    assert_eq!(written, 0);
}

/// Imports with a listener installed and returns every event it heard, in order.
fn events_while_importing(fixture: &Fixture) -> Vec<HostEvent> {
    let events = Arc::new(Mutex::new(Vec::new()));
    let heard = Arc::clone(&events);
    let mut plugin = fixture.media_source();
    plugin.listen(move |event| heard.lock().unwrap().push(event));
    plugin
        .import(&fixture.import_request(&["en"]), &fixture.output_path(""))
        .expect("import");
    // Cloned out of the lock before the guard is dropped at the end of the statement.
    events.lock().unwrap().clone()
}

#[test]
fn the_listener_hears_each_progress_report_as_it_happens() {
    let fixture = Fixture::start();
    let progress = events_while_importing(&fixture)
        .into_iter()
        .filter(|event| matches!(event, HostEvent::Progress(_)))
        .count();
    assert!(progress >= 2, "got {progress} progress events");
}

#[test]
fn the_listener_hears_the_command_the_plugin_runs() {
    let fixture = Fixture::start();
    let started = events_while_importing(&fixture)
        .into_iter()
        .find_map(|event| match event {
            HostEvent::CommandStarted { command, args } => Some((command, args)),
            _ => None,
        });
    assert_eq!(
        started,
        Some(("fetch-locator".to_string(), vec![fixture.locator()]))
    );
}

#[test]
fn the_listener_hears_what_the_command_prints() {
    let fixture = Fixture::start();
    let printed = events_while_importing(&fixture).into_iter().any(|event| {
        matches!(event, HostEvent::CommandOutput { line, .. } if line.contains("\"title\":\"Fixture\""))
    });
    assert!(printed);
}

fn files_match(written: &str, fixture: &Path) -> bool {
    std::fs::read(written).expect("read the written file")
        == std::fs::read(fixture).expect("read the fixture")
}
