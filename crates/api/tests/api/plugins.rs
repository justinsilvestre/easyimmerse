//! The plugin routes, exercised with the `fixture-media-source` plugin built by
//! `mise run plugins:build`, which fetches a video and subtitles from a loopback server.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

use easyimmerse_api::ServeOptions;
use serde_json::{Value, json};
use tempfile::TempDir;
use tiny_http::{Header, Response, Server};

use crate::support::{TestServer, fixture_path, seeded_storage, spawn_test_server_with_options};

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

    /// Starts a fetch of `locator` and returns the running job.
    async fn start_fetch(&self, locator: &str) -> Value {
        let response = self
            .server
            .post_json(
                &format!("/projects/{PROJECT}/media/from-source"),
                &json!({ "plugin": PLUGIN, "locator": locator }),
            )
            .await;
        assert_eq!(response.status, 202, "{}", response.text());
        response.json()
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

    /// Fetches the sample locator and returns the added media file.
    async fn add(&self) -> Value {
        let job = self.start_fetch(&self.locator()).await;
        let job = self.finished(&job).await;
        assert_eq!(job["status"], "done", "{job}");
        job["media_file"].clone()
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
async fn lists_an_installed_plugin_with_its_kind() {
    let fixture = Fixture::start(false).await;
    let response = fixture.server.get("/plugins").await;
    assert_eq!(
        response.json(),
        json!({ "plugins": [{ "name": PLUGIN, "version": "0.1.0", "kind": "media-source" }] })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_plugin_that_is_not_installed() {
    let fixture = Fixture::start(false).await;
    let response = fixture
        .server
        .post_json(
            &format!("/projects/{PROJECT}/media/from-source"),
            &json!({ "plugin": "missing", "locator": fixture.locator() }),
        )
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_project_that_does_not_exist() {
    let fixture = Fixture::start(false).await;
    let response = fixture
        .server
        .post_json(
            "/projects/missing/media/from-source",
            &json!({ "plugin": PLUGIN, "locator": fixture.locator() }),
        )
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn answers_with_the_running_job() {
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
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/media/from-source"),
            &json!({ "plugin": PLUGIN, "locator": "http://127.0.0.1:1/sample" }),
        )
        .await;
    assert_eq!(response.status, 503);
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
