use std::path::Path;
use std::sync::{Arc, Mutex, OnceLock};

use crate::support::FixtureServer;
use easyimmerse_core::providers::plugin_form::{FormControl, FormInput, PluginForm};
use easyimmerse_plugins::{
    CapabilityGrants, CompiledPlugin, FetchRequest, HeldSubtitle, HostEvent, HostLimits,
    ImportAnswer, ImportContext, ImportRequest, MediaAnswer, MediaContext,
    MediaSourceFixturePlugin, MediaSourcePlugin, MediaUpdate, PluginError, PluginErrorKind,
    PluginPackage,
};

/// One build of the fixture plugin, opened and compiled once per test process,
/// so that the tests share the compiled component.
struct PluginUnderTest {
    name: &'static str,
    compiled: OnceLock<(PluginPackage, CompiledPlugin)>,
}

impl PluginUnderTest {
    const fn new(name: &'static str) -> Self {
        Self {
            name,
            compiled: OnceLock::new(),
        }
    }

    fn compiled(&self) -> &(PluginPackage, CompiledPlugin) {
        self.compiled.get_or_init(|| {
            let package = PluginPackage::open(&crate::support::built_plugin_dir(self.name))
                .expect("open the package");
            let compiled = CompiledPlugin::compile(&package, crate::support::execution_mode())
                .expect("compile the plugin");
            (package, compiled)
        })
    }
}

static RUST_PLUGIN: PluginUnderTest = PluginUnderTest::new("fixture-media-source");
static JS_PLUGIN: PluginUnderTest = PluginUnderTest::new("fixture-media-source-js");

/// Declares a test for each named case against each build of the fixture plugin,
/// in the modules `rust_plugin` and `js_plugin`.
macro_rules! test_each_plugin {
    ($($case:ident),* $(,)?) => {
        mod rust_plugin {
            $(#[test] fn $case() { super::$case(&super::RUST_PLUGIN) })*
        }
        mod js_plugin {
            $(#[test] fn $case() { super::$case(&super::JS_PLUGIN) })*
        }
    };
}

test_each_plugin!(
    refuses_to_run_a_command_that_is_not_bundled,
    refuses_to_fetch_from_a_host_that_is_not_allowed,
    offers_a_locator_field_in_the_import_form,
    answers_the_import_action_with_the_import_to_run,
    names_the_subtitle_tracks_an_import_will_fetch,
    refuses_an_import_step_without_a_locator,
    reports_progress_while_importing,
    writes_the_media_and_subtitles_into_the_granted_dir,
    imports_the_title_the_source_gives,
    imports_no_subtitles_when_none_are_chosen,
    reports_the_language_of_each_subtitle_file,
    offers_a_track_that_is_not_held_in_the_media_form,
    offers_no_track_that_is_held_in_the_media_form,
    lists_the_held_tracks_for_removal_in_the_media_form,
    answers_the_apply_action_with_the_update_to_apply,
    fetches_subtitles_on_their_own,
    refuses_to_fetch_a_subtitle_track_the_source_does_not_offer,
    shows_forms_without_writing_anything,
    the_listener_hears_each_progress_report_as_it_happens,
    the_listener_hears_the_command_the_plugin_runs,
    the_listener_hears_what_the_command_prints,
);

/// A compiled fixture plugin, with a server for it to fetch from and a directory
/// granted to it.
pub(crate) struct Fixture {
    pub(crate) server: FixtureServer,
    pub(crate) output_dir: tempfile::TempDir,
    compiled: &'static CompiledPlugin,
    grants: CapabilityGrants,
}

impl Fixture {
    /// A fixture around the Rust build of the plugin.
    pub(crate) fn start() -> Self {
        Self::start_with(&RUST_PLUGIN)
    }

    fn start_with(plugin: &'static PluginUnderTest) -> Self {
        let server = crate::support::start_fixture_http_server();
        let output_dir = tempfile::tempdir().expect("create a temp dir");
        let (package, compiled) = plugin.compiled();
        let grants = CapabilityGrants {
            allowed_hosts: package.manifest.allowed_hosts.clone(),
            granted_dirs: vec![output_dir.path().to_path_buf()],
            bundled_bin_dir: package
                .bin_dir
                .clone()
                .or_else(|| crate::support::source_bin_dir(plugin.name)),
            ..CapabilityGrants::default()
        };
        Self {
            server,
            output_dir,
            compiled,
            grants,
        }
    }

    /// The component through its `media-source` export, as the app loads it.
    fn media_source(&self) -> MediaSourcePlugin {
        MediaSourcePlugin::instantiate(self.compiled, self.grants.clone(), HostLimits::default())
            .expect("instantiate the plugin")
    }

    /// The component through its test-only `sandbox-probe` export.
    pub(crate) fn probe(&self) -> MediaSourceFixturePlugin {
        self.probe_with_limits(HostLimits::default())
    }

    pub(crate) fn probe_with_limits(&self, limits: HostLimits) -> MediaSourceFixturePlugin {
        MediaSourceFixturePlugin::instantiate(self.compiled, self.grants.clone(), limits)
            .expect("instantiate the plugin")
    }

    fn locator(&self) -> String {
        format!("{}/sample", self.server.base_url)
    }

    pub(crate) fn output_path(&self, file_name: &str) -> String {
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

fn refuses_to_run_a_command_that_is_not_bundled(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
    let outcome = fixture
        .probe()
        .probe_run(UNBUNDLED_COMMAND)
        .expect("the call completes");
    assert!(
        matches!(outcome, Err(PluginErrorKind::NotPermitted(_))),
        "got {outcome:?}"
    );
}

fn refuses_to_fetch_from_a_host_that_is_not_allowed(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
    let outcome = fixture
        .probe()
        .probe_get("http://example.com/")
        .expect("the call completes");
    assert!(
        matches!(outcome, Err(PluginErrorKind::NotPermitted(_))),
        "got {outcome:?}"
    );
}

fn offers_a_locator_field_in_the_import_form(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
    let form = fixture
        .media_source()
        .import_form(&import_context())
        .expect("import form");
    let fields: Vec<_> = form.fields.iter().map(|field| field.id.as_str()).collect();
    assert_eq!(fields, vec!["locator"]);
}

fn answers_the_import_action_with_the_import_to_run(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
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

fn names_the_subtitle_tracks_an_import_will_fetch(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
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

fn refuses_an_import_step_without_a_locator(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
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

fn reports_progress_while_importing(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
    let (request, output_dir) = (fixture.import_request(&["en"]), fixture.output_path(""));
    let (_, progress) = fixture
        .media_source()
        .import(&request, &output_dir)
        .expect("import");
    assert!(progress.len() >= 2, "got {progress:?}");
}

fn writes_the_media_and_subtitles_into_the_granted_dir(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
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

fn imports_the_title_the_source_gives(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
    let (request, output_dir) = (fixture.import_request(&[]), fixture.output_path(""));
    let (resolved, _) = fixture
        .media_source()
        .import(&request, &output_dir)
        .expect("import");
    assert_eq!(resolved.title, "Fixture");
}

fn imports_no_subtitles_when_none_are_chosen(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
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

fn reports_the_language_of_each_subtitle_file(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
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

fn offers_a_track_that_is_not_held_in_the_media_form(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
    let form = fixture
        .media_source()
        .media_form(&fixture.media_context(&[]))
        .expect("media form");
    assert_eq!(option_ids(&form, "fetch"), vec!["en"]);
}

fn offers_no_track_that_is_held_in_the_media_form(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
    let form = fixture
        .media_source()
        .media_form(&fixture.media_context(&[("track-1", "English")]))
        .expect("media form");
    assert!(option_ids(&form, "fetch").is_empty());
}

fn lists_the_held_tracks_for_removal_in_the_media_form(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
    let form = fixture
        .media_source()
        .media_form(&fixture.media_context(&[("track-1", "English")]))
        .expect("media form");
    assert_eq!(option_ids(&form, "remove"), vec!["track-1"]);
}

fn answers_the_apply_action_with_the_update_to_apply(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
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

fn fetches_subtitles_on_their_own(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
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

fn refuses_to_fetch_a_subtitle_track_the_source_does_not_offer(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
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

fn shows_forms_without_writing_anything(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
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

fn the_listener_hears_each_progress_report_as_it_happens(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
    let progress = events_while_importing(&fixture)
        .into_iter()
        .filter(|event| matches!(event, HostEvent::Progress(_)))
        .count();
    assert!(progress >= 2, "got {progress} progress events");
}

fn the_listener_hears_the_command_the_plugin_runs(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
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

fn the_listener_hears_what_the_command_prints(plugin: &'static PluginUnderTest) {
    let fixture = Fixture::start_with(plugin);
    let printed = events_while_importing(&fixture).into_iter().any(|event| {
        matches!(event, HostEvent::CommandOutput { line, .. } if line.contains("\"title\":\"Fixture\""))
    });
    assert!(printed);
}

fn files_match(written: &str, fixture: &Path) -> bool {
    std::fs::read(written).expect("read the written file")
        == std::fs::read(fixture).expect("read the fixture")
}
