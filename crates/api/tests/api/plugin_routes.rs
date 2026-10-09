//! The plugin routes, exercised with the `fixture-media-source` plugin built by
//! `mise run plugins:build`, which imports a video and subtitles from a loopback server.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

use easyimmerse_api::ServeOptions;
use serde_json::{Value, json};
use tempfile::TempDir;
use tiny_http::{Header, Response, Server};

use crate::support::{
    TestResponse, TestServer, fixture_path, seeded_storage, spawn_test_server_with_options,
};

const PROJECT: &str = "placeholder-1";
const PLUGIN: &str = "fixture-media-source";

/// A server with the fixture plugin installed and a media directory, both living as long as
/// the returned directories, plus the loopback server the plugin fetches from.
struct Fixture {
    server: TestServer,
    fixtures: FixtureServer,
    media_dir: TempDir,
    _plugins_dir: TempDir,
}

impl Fixture {
    async fn start(allow_local_paths: bool) -> Self {
        let plugins_dir = TempDir::new().expect("a plugins directory");
        install_fixture_plugin(plugins_dir.path());
        let media_dir = TempDir::new().expect("a media directory");
        let options = ServeOptions {
            plugins_dir: Some(plugins_dir.path().to_path_buf()),
            media_dir: Some(media_dir.path().to_path_buf()),
            ..ServeOptions::default()
        };
        let server =
            spawn_test_server_with_options(allow_local_paths, seeded_storage(), options).await;
        Self {
            server,
            fixtures: start_fixture_http_server(),
            media_dir,
            _plugins_dir: plugins_dir,
        }
    }

    fn locator(&self) -> String {
        format!("{}/sample", self.fixtures.base_url)
    }

    /// Sends an action of the fixture's import interface with the given input.
    async fn import_step(&self, action: &str, input: Value) -> TestResponse {
        self.server
            .post_json(
                &format!("/projects/{PROJECT}/media/import-step"),
                &json!({ "plugin": PLUGIN, "action": action, "input": input }),
            )
            .await
    }

    /// Starts an import of `locator` with the given subtitle tracks and returns the
    /// running job.
    async fn start_import(&self, locator: &str, subtitles: &[&str]) -> Value {
        let input = json!([
            { "field": "locator", "values": [locator] },
            { "field": "subtitles", "values": subtitles },
        ]);
        let response = self.import_step("import", input).await;
        assert_eq!(response.status, 200, "{}", response.text());
        let body = response.json();
        assert_eq!(body["kind"], "job", "{body}");
        body["job"].clone()
    }

    /// Starts an import of `locator` with the English subtitle track.
    async fn start_fetch(&self, locator: &str) -> Value {
        self.start_import(locator, &["en"]).await
    }

    /// Imports the sample locator with the given subtitle tracks and returns the added
    /// media file.
    async fn add_with_subtitles(&self, subtitles: &[&str]) -> Value {
        let job = self.start_import(&self.locator(), subtitles).await;
        let job = self.finished(&job).await;
        assert_eq!(job["status"], "done", "{job}");
        job["media_file"].clone()
    }

    async fn source_form(&self, media_file: &Value) -> TestResponse {
        self.server
            .get(&format!(
                "/projects/{PROJECT}/media/{}/source-form",
                media_id(media_file)
            ))
            .await
    }

    /// Sends the `apply` action of the fixture's media interface for `media_file`.
    async fn apply(&self, media_file: &Value, fetch: &[&str], remove: &[&str]) -> Value {
        let response = self.source_step(media_file, "apply", fetch, remove).await;
        assert_eq!(response.status, 200, "{}", response.text());
        response.json()
    }

    async fn source_step(
        &self,
        media_file: &Value,
        action: &str,
        fetch: &[&str],
        remove: &[&str],
    ) -> TestResponse {
        let input = json!([
            { "field": "fetch", "values": fetch },
            { "field": "remove", "values": remove },
        ]);
        self.server
            .post_json(
                &format!(
                    "/projects/{PROJECT}/media/{}/source-step",
                    media_id(media_file)
                ),
                &json!({ "action": action, "input": input }),
            )
            .await
    }

    async fn subtitle_tracks(&self, media_file: &Value) -> Value {
        self.server
            .get(&format!(
                "/projects/{PROJECT}/media/{}/subtitles",
                media_id(media_file)
            ))
            .await
            .json()
    }

    /// Polls the job until it is done or has failed.
    async fn finished(&self, job: &Value) -> Value {
        let path = format!(
            "/projects/{PROJECT}/media/from-source/{}",
            job["id"].as_str().expect("a job id")
        );
        let deadline = Instant::now() + Duration::from_secs(30);
        loop {
            let job = self.server.get(&path).await.json();
            if job["status"] != "running" {
                return job;
            }
            assert!(Instant::now() < deadline, "the job did not finish: {job}");
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
    }

    /// Imports the sample locator with the English subtitle track and returns the added
    /// media file.
    async fn add(&self) -> Value {
        self.add_with_subtitles(&["en"]).await
    }
}

/// Copies the built plugin package into `plugins_dir`, as installing it would.
fn install_fixture_plugin(plugins_dir: &Path) {
    let dist = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../plugins")
        .join(PLUGIN)
        .join("dist");
    assert!(
        dist.join("plugin.wasm").is_file(),
        "{} is missing; run `mise run plugins:build` first",
        dist.join("plugin.wasm").display()
    );
    copy_dir(&dist, &plugins_dir.join(PLUGIN));
}

fn copy_dir(from: &Path, to: &Path) {
    std::fs::create_dir_all(to).expect("create the directory");
    for entry in std::fs::read_dir(from).expect("read the directory") {
        let entry = entry.expect("a directory entry");
        let target = to.join(entry.file_name());
        if entry.path().is_dir() {
            copy_dir(&entry.path(), &target);
        } else {
            std::fs::copy(entry.path(), target).expect("copy the file");
        }
    }
}

fn media_id(media_file: &Value) -> &str {
    media_file["id"].as_str().expect("a media file id")
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_no_plugins_without_a_plugins_dir() {
    let server = crate::support::spawn_test_server(false).await;
    let response = server.get("/plugins").await;
    assert_eq!(response.json(), json!({ "plugins": [] }));
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_an_installed_plugin_with_its_kind_title_and_import_label() {
    let fixture = Fixture::start(false).await;
    let response = fixture.server.get("/plugins").await;
    assert_eq!(
        response.json(),
        json!({ "plugins": [{
            "name": PLUGIN,
            "title": "Fixture",
            "version": "0.1.0",
            "kind": "media-source",
            "import_label": "Add from Fixture",
        }] })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn answers_with_the_plugins_import_form() {
    let fixture = Fixture::start(false).await;
    let response = fixture
        .server
        .post_json(
            &format!("/projects/{PROJECT}/media/import-form"),
            &json!({ "plugin": PLUGIN }),
        )
        .await;
    assert_eq!(
        (response.status, response.json()["fields"][0]["id"].clone()),
        (200, json!("locator"))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_the_import_form_of_a_plugin_that_is_not_installed() {
    let fixture = Fixture::start(false).await;
    let response = fixture
        .server
        .post_json(
            &format!("/projects/{PROJECT}/media/import-form"),
            &json!({ "plugin": "missing" }),
        )
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_an_import_step_whose_input_the_plugin_rejects() {
    let fixture = Fixture::start(false).await;
    let input = json!([{ "field": "locator", "values": [""] }]);
    let response = fixture.import_step("import", input).await;
    assert_eq!(
        (response.status, response.json()["code"].clone()),
        (400, json!("invalid_input"))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_an_import_step_through_a_plugin_that_is_not_installed() {
    let fixture = Fixture::start(false).await;
    let response = fixture
        .server
        .post_json(
            &format!("/projects/{PROJECT}/media/import-step"),
            &json!({ "plugin": "missing", "action": "import", "input": [] }),
        )
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_an_import_step_for_a_project_that_does_not_exist() {
    let fixture = Fixture::start(false).await;
    let response = fixture
        .server
        .post_json(
            "/projects/missing/media/import-step",
            &json!({ "plugin": PLUGIN, "action": "import", "input": [] }),
        )
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn answers_an_import_step_that_imports_with_the_running_job() {
    let fixture = Fixture::start(false).await;
    let job = fixture.start_fetch(&fixture.locator()).await;
    assert_eq!(
        (
            job["status"].clone(),
            job["plugin"].clone(),
            job["media_file"].clone()
        ),
        (json!("running"), json!(PLUGIN), Value::Null)
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn adds_no_subtitles_when_none_are_chosen() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add_with_subtitles(&[]).await;
    let tracks = fixture.subtitle_tracks(&added).await;
    assert_eq!(tracks["tracks"].as_array().map(Vec::len), Some(0));
}

#[tokio::test(flavor = "multi_thread")]
async fn records_where_the_media_was_fetched_from() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add().await;
    assert_eq!(
        added["origin"],
        json!({ "plugin": PLUGIN, "locator": fixture.locator() })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn names_a_fetched_track_as_the_source_does() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add().await;
    let tracks = fixture.subtitle_tracks(&added).await;
    assert_eq!(tracks["tracks"][0]["name"], "English");
}

#[tokio::test(flavor = "multi_thread")]
async fn answers_404_for_a_job_of_another_project() {
    let fixture = Fixture::start(false).await;
    let job = fixture.start_fetch(&fixture.locator()).await;
    let response = fixture
        .server
        .get(&format!(
            "/projects/placeholder-2/media/from-source/{}",
            job["id"].as_str().unwrap()
        ))
        .await;
    assert_eq!(response.status, 404);
}

/// A fetch that misbehaves is first a question of which build of the plugin ran, so the job
/// starts by saying so.
#[tokio::test(flavor = "multi_thread")]
async fn a_job_first_logs_the_plugin_build_it_runs() {
    let fixture = Fixture::start(false).await;
    let job = fixture.start_fetch(&fixture.locator()).await;
    let first = job["log"][0]["message"].as_str().unwrap_or_default();
    assert!(
        first.starts_with(&format!("running {PLUGIN} 0.1.0 (component ")) && first.ends_with(')'),
        "{first:?}"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_finished_job_carries_the_plugins_last_progress_report() {
    let fixture = Fixture::start(false).await;
    let job = fixture.start_fetch(&fixture.locator()).await;
    let job = fixture.finished(&job).await;
    assert_eq!(job["progress"]["fraction"], 1.0);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_finished_job_logs_the_command_the_plugin_ran() {
    let fixture = Fixture::start(false).await;
    let job = fixture.start_fetch(&fixture.locator()).await;
    let job = fixture.finished(&job).await;
    let messages: Vec<&str> = job["log"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|line| line["message"].as_str())
        .collect();
    assert!(
        messages
            .iter()
            .any(|message| message.starts_with("running fetch-locator ")),
        "{messages:?}"
    );
}

/// The fixture plugin may only fetch from the loopback interface, so a locator elsewhere
/// makes the host refuse its request and the plugin report that.
#[tokio::test(flavor = "multi_thread")]
async fn a_fetch_the_plugin_could_not_complete_fails_the_job() {
    let fixture = Fixture::start(false).await;
    let job = fixture.start_fetch("http://example.com/sample").await;
    let job = fixture.finished(&job).await;
    assert_eq!(
        (job["status"].clone(), job["error"]["code"].clone()),
        (json!("failed"), json!("media_source_failed"))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_failed_job_ends_its_log_with_the_error() {
    let fixture = Fixture::start(false).await;
    let job = fixture.start_fetch("http://example.com/sample").await;
    let job = fixture.finished(&job).await;
    let last = job["log"].as_array().unwrap().last().cloned().unwrap();
    assert_eq!(
        (last["level"].clone(), last["message"].clone()),
        (json!("error"), job["error"]["message"].clone())
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn leaves_nothing_in_the_media_dir_after_a_failed_fetch() {
    let fixture = Fixture::start(false).await;
    let job = fixture.start_fetch("http://example.com/sample").await;
    fixture.finished(&job).await;
    let plugin_dir = fixture.media_dir.path().join(PLUGIN);
    let items = std::fs::read_dir(&plugin_dir)
        .map(Iterator::count)
        .unwrap_or(0);
    assert_eq!(items, 0);
}

#[tokio::test(flavor = "multi_thread")]
async fn names_the_added_media_after_its_title() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add().await;
    assert_eq!(added["name"], "Fixture.mp4");
}

#[tokio::test(flavor = "multi_thread")]
async fn puts_the_fetched_media_in_the_media_dir() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add().await;
    let path = Path::new(added["source"]["path"].as_str().unwrap());
    assert!(
        path.canonicalize()
            .unwrap()
            .starts_with(fixture.media_dir.path().canonicalize().unwrap()),
        "{}",
        path.display()
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_the_added_media_in_the_project() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add().await;
    let response = fixture
        .server
        .get(&format!("/projects/{PROJECT}/media"))
        .await;
    assert_eq!(response.json()["media_files"], json!([added]));
}

#[tokio::test(flavor = "multi_thread")]
async fn streams_the_fetched_media_without_local_path_permission() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add().await;
    let response = fixture
        .server
        .get(&format!(
            "/projects/{PROJECT}/media/{}/stream",
            media_id(&added)
        ))
        .await;
    assert_eq!(response.status, 200);
}

#[tokio::test(flavor = "multi_thread")]
async fn adds_the_fetched_subtitles_as_a_track() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add().await;
    let response = fixture
        .server
        .get(&format!(
            "/projects/{PROJECT}/media/{}/subtitles",
            media_id(&added)
        ))
        .await;
    let tracks = response.json()["tracks"].as_array().unwrap().clone();
    assert_eq!(tracks.len(), 1, "{tracks:?}");
}

#[tokio::test(flavor = "multi_thread")]
async fn gives_the_subtitles_in_the_translation_language_that_role() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add().await;
    let response = fixture
        .server
        .get(&format!(
            "/projects/{PROJECT}/media/{}/subtitles",
            media_id(&added)
        ))
        .await;
    let body = response.json();
    assert_eq!(
        body["selection"]["translation_track_id"],
        body["tracks"][0]["id"]
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_the_fetched_subtitles_cues_without_local_path_permission() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add().await;
    let tracks = fixture
        .server
        .get(&format!(
            "/projects/{PROJECT}/media/{}/subtitles",
            media_id(&added)
        ))
        .await
        .json();
    let track_id = tracks["tracks"][0]["id"].as_str().unwrap().to_string();
    let response = fixture
        .server
        .get(&format!(
            "/projects/{PROJECT}/media/{}/subtitles/{track_id}/cues",
            media_id(&added)
        ))
        .await;
    assert_eq!(response.status, 200, "{}", response.text());
}

#[tokio::test(flavor = "multi_thread")]
async fn removing_the_media_file_deletes_what_was_fetched() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add().await;
    let path = PathBuf::from(added["source"]["path"].as_str().unwrap());
    let response = fixture
        .server
        .delete(&format!("/projects/{PROJECT}/media/{}", media_id(&added)))
        .await;
    assert_eq!(response.status, 204);
    assert!(!path.parent().unwrap().exists());
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_to_add_media_without_a_media_dir() {
    let plugins_dir = TempDir::new().expect("a plugins directory");
    install_fixture_plugin(plugins_dir.path());
    let options = ServeOptions {
        plugins_dir: Some(plugins_dir.path().to_path_buf()),
        ..ServeOptions::default()
    };
    let server = spawn_test_server_with_options(false, seeded_storage(), options).await;
    let input = json!([{ "field": "locator", "values": ["http://127.0.0.1:1/sample"] }]);
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/media/import-step"),
            &json!({ "plugin": PLUGIN, "action": "import", "input": input }),
        )
        .await;
    assert_eq!(response.status, 503);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_an_import_step_without_a_media_dir_before_asking_the_plugin() {
    let plugins_dir = TempDir::new().expect("a plugins directory");
    install_fixture_plugin(plugins_dir.path());
    let options = ServeOptions {
        plugins_dir: Some(plugins_dir.path().to_path_buf()),
        ..ServeOptions::default()
    };
    let server = spawn_test_server_with_options(false, seeded_storage(), options).await;
    // The plugin refuses an empty locator, so a 503 shows that it was never asked.
    let input = json!([{ "field": "locator", "values": [""] }]);
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/media/import-step"),
            &json!({ "plugin": PLUGIN, "action": "import", "input": input }),
        )
        .await;
    assert_eq!(
        (response.status, response.json()["code"].clone()),
        (503, json!("media_dir_unavailable"))
    );
}

/// The option ids of the choice field `field` in a form.
fn option_ids(form: &Value, field: &str) -> Vec<Value> {
    let fields = form["fields"].as_array().expect("form fields");
    let found = fields.iter().find(|candidate| candidate["id"] == field);
    let options = found.expect("the field")["control"]["options"]
        .as_array()
        .expect("options");
    options.iter().map(|option| option["id"].clone()).collect()
}

#[tokio::test(flavor = "multi_thread")]
async fn the_source_form_lists_the_held_tracks() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add().await;
    let tracks = fixture.subtitle_tracks(&added).await;
    let form = fixture.source_form(&added).await.json();
    assert_eq!(
        option_ids(&form, "remove"),
        vec![tracks["tracks"][0]["id"].clone()]
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn the_source_form_offers_a_track_that_is_not_held() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add_with_subtitles(&[]).await;
    let form = fixture.source_form(&added).await.json();
    assert_eq!(option_ids(&form, "fetch"), vec![json!("en")]);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_the_source_form_of_a_media_file_without_an_origin() {
    let fixture = Fixture::start(true).await;
    let response = fixture
        .server
        .post_json(
            &format!("/projects/{PROJECT}/media"),
            &json!({ "name": "a.mp4", "source": { "kind": "path", "path": fixture_path("sample.mp4").to_string_lossy() } }),
        )
        .await;
    let response = fixture.source_form(&response.json()).await;
    assert_eq!(response.status, 409, "{}", response.text());
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_source_step_whose_action_the_plugin_rejects() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add_with_subtitles(&[]).await;
    let response = fixture.source_step(&added, "unknown", &[], &[]).await;
    assert_eq!(response.status, 400, "{}", response.text());
}

#[tokio::test(flavor = "multi_thread")]
async fn a_source_step_removes_a_held_track() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add().await;
    let track_id = fixture.subtitle_tracks(&added).await["tracks"][0]["id"].clone();
    let body = fixture
        .apply(&added, &[], &[track_id.as_str().unwrap()])
        .await;
    assert_eq!(
        (
            body["kind"].clone(),
            body["removed"].clone(),
            body["tracks"].clone()
        ),
        (json!("applied"), json!([track_id]), json!([]))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_source_step_clears_a_removed_track_from_the_selection() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add().await;
    let track_id = fixture.subtitle_tracks(&added).await["tracks"][0]["id"].clone();
    let body = fixture
        .apply(&added, &[], &[track_id.as_str().unwrap()])
        .await;
    assert_eq!(body["selection"]["translation_track_id"], Value::Null);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_source_step_removes_no_track_of_another_media_file() {
    let fixture = Fixture::start(false).await;
    let other = fixture.add().await;
    let track_id = fixture.subtitle_tracks(&other).await["tracks"][0]["id"].clone();
    let added = fixture.add_with_subtitles(&[]).await;
    fixture
        .apply(&added, &[], &[track_id.as_str().unwrap()])
        .await;
    let tracks = fixture.subtitle_tracks(&other).await;
    assert_eq!(tracks["tracks"].as_array().map(Vec::len), Some(1));
}

#[tokio::test(flavor = "multi_thread")]
async fn a_source_step_whose_fetch_fails_removes_no_track() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add().await;
    let track_id = fixture.subtitle_tracks(&added).await["tracks"][0]["id"].clone();
    fixture
        .source_step(&added, "apply", &["unknown"], &[track_id.as_str().unwrap()])
        .await;
    let tracks = fixture.subtitle_tracks(&added).await;
    assert_eq!(tracks["tracks"].as_array().map(Vec::len), Some(1));
}

#[tokio::test(flavor = "multi_thread")]
async fn a_source_step_fetches_a_track() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add_with_subtitles(&[]).await;
    let body = fixture.apply(&added, &["en"], &[]).await;
    assert_eq!(
        (
            body["kind"].clone(),
            body["tracks"].as_array().map(Vec::len)
        ),
        (json!("applied"), Some(1)),
        "{body}"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_track_fetched_later_takes_a_free_role() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add_with_subtitles(&[]).await;
    let body = fixture.apply(&added, &["en"], &[]).await;
    assert_eq!(
        body["selection"]["translation_track_id"],
        body["tracks"][0]["id"]
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_track_fetched_later_lands_beside_the_media() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add_with_subtitles(&[]).await;
    let media_path = PathBuf::from(added["source"]["path"].as_str().unwrap());
    fixture.apply(&added, &["en"], &[]).await;
    let item_dir = media_path.parent().unwrap();
    let written = std::fs::read_dir(item_dir)
        .unwrap()
        .filter_map(|entry| entry.ok())
        .find(|entry| {
            entry
                .file_name()
                .to_string_lossy()
                .starts_with("subtitles-")
        })
        .map(|entry| entry.path().join("subtitles.srt").is_file());
    assert_eq!(written, Some(true));
}

/// The directory the media file was fetched into.
fn item_dir(media_file: &Value) -> PathBuf {
    let media_path = Path::new(media_file["source"]["path"].as_str().expect("a media path"));
    media_path
        .parent()
        .expect("an item directory")
        .to_path_buf()
}

/// The directories that subtitles fetched after the import were written into.
fn subtitles_dirs(media_file: &Value) -> Vec<PathBuf> {
    std::fs::read_dir(item_dir(media_file))
        .expect("read the item directory")
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry
                .file_name()
                .to_string_lossy()
                .starts_with("subtitles-")
        })
        .map(|entry| entry.path())
        .collect()
}

#[tokio::test(flavor = "multi_thread")]
async fn a_source_step_deletes_the_file_of_a_track_fetched_with_the_media() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add().await;
    let track_id = fixture.subtitle_tracks(&added).await["tracks"][0]["id"].clone();
    fixture
        .apply(&added, &[], &[track_id.as_str().unwrap()])
        .await;
    assert!(!item_dir(&added).join("subtitles.srt").exists());
}

#[tokio::test(flavor = "multi_thread")]
async fn a_source_step_deletes_the_directory_of_a_track_fetched_later() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add_with_subtitles(&[]).await;
    fixture.apply(&added, &["en"], &[]).await;
    let track_id = fixture.subtitle_tracks(&added).await["tracks"][0]["id"].clone();
    fixture
        .apply(&added, &[], &[track_id.as_str().unwrap()])
        .await;
    assert_eq!(subtitles_dirs(&added), Vec::<PathBuf>::new());
}

#[tokio::test(flavor = "multi_thread")]
async fn a_source_step_keeps_the_file_of_a_track_outside_the_media_dir() {
    let fixture = Fixture::start(true).await;
    let added = fixture.add_with_subtitles(&[]).await;
    let elsewhere = TempDir::new().expect("a directory outside the media directory");
    let file = elsewhere.path().join("sample.srt");
    std::fs::copy(fixture_path("sample.srt"), &file).expect("copy the subtitles");
    let track = fixture
        .server
        .post_json(
            &format!("/projects/{PROJECT}/media/{}/subtitles", media_id(&added)),
            &json!({ "name": "sample.srt", "source": { "kind": "path", "path": file }, "format": null, "role": null }),
        )
        .await
        .json();
    fixture
        .apply(&added, &[], &[track["id"].as_str().unwrap()])
        .await;
    assert!(file.is_file());
}

#[tokio::test(flavor = "multi_thread")]
async fn a_source_step_whose_fetch_fails_leaves_no_subtitles_dir() {
    let fixture = Fixture::start(false).await;
    let added = fixture.add_with_subtitles(&[]).await;
    fixture
        .source_step(&added, "apply", &["unknown"], &[])
        .await;
    assert_eq!(subtitles_dirs(&added), Vec::<PathBuf>::new());
}

/// An HTTP server on the loopback interface serving the files under `fixtures/`.
/// It stops when dropped.
struct FixtureServer {
    base_url: String,
    server: Arc<Server>,
}

impl Drop for FixtureServer {
    fn drop(&mut self) {
        self.server.unblock();
    }
}

fn start_fixture_http_server() -> FixtureServer {
    let server = Arc::new(Server::http("127.0.0.1:0").expect("bind a loopback port"));
    let port = server.server_addr().to_ip().expect("an IP address").port();
    let served = Arc::clone(&server);
    std::thread::spawn(move || serve_fixtures(&served));
    FixtureServer {
        base_url: format!("http://127.0.0.1:{port}"),
        server,
    }
}

fn serve_fixtures(server: &Server) {
    for request in server.incoming_requests() {
        let response = fixture_response(request.url());
        let _ = request.respond(response);
    }
}

fn fixture_response(url: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let name = url.trim_start_matches('/');
    match std::fs::read(fixture_path(name)) {
        Ok(bytes) => Response::from_data(bytes).with_header(
            Header::from_bytes("Content-Type", "application/octet-stream").expect("a header"),
        ),
        Err(_) => Response::from_string("not found").with_status_code(404),
    }
}
