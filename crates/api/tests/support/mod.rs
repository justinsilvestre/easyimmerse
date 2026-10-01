//! Starts the API on a free loopback port and sends requests to it with a blocking client.

#![allow(dead_code)]

use std::path::PathBuf;

use easyimmerse_api::{ApiConfig, AppState, ConversionService, ServerHandle, serve};
use easyimmerse_media_ffmpeg::{BinaryName, FfmpegPaths, locate_binary};
use easyimmerse_storage::Storage;
use serde_json::{Value, json};
use tempfile::TempDir;
use tokio::net::TcpListener;
use ureq::Agent;
use ureq::http::Request;

pub const TOKEN: &str = "test-token";

/// The codec string of the audio that conversions transcode to.
const AAC_CODEC: &str = "mp4a.40.2";

pub struct TestServer {
    pub base_url: String,
    pub token: String,
    pub handle: ServerHandle,
}

pub struct TestResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub bytes: Vec<u8>,
}

impl TestResponse {
    pub fn json(&self) -> Value {
        serde_json::from_slice(&self.bytes).expect("response body should be JSON")
    }

    /// Returns the value of the first header with the given name, ignoring case.
    pub fn header(&self, name: &str) -> Option<&str> {
        self.headers
            .iter()
            .find(|(header, _)| header.eq_ignore_ascii_case(name))
            .map(|(_, value)| value.as_str())
    }
}

/// A request with the correct Host header and, by default, the test token.
pub struct TestRequest {
    method: &'static str,
    url: String,
    headers: Vec<(String, String)>,
    body: Vec<u8>,
}

pub async fn spawn_test_server(allow_local_paths: bool) -> TestServer {
    spawn_server_with(allow_local_paths, None).await
}

/// Starts a server that may read local paths and caches conversions in the returned directory.
pub async fn spawn_converting_server() -> (TestServer, TempDir) {
    let cache = TempDir::new().expect("a cache directory");
    let conversions = ConversionService::new(cache.path().to_path_buf(), FfmpegPaths::default())
        .expect("ffmpeg to be found");
    (spawn_server_with(true, Some(conversions)).await, cache)
}

/// Reports whether ffmpeg and ffprobe can be found, and explains the skip when they cannot.
pub fn has_ffmpeg() -> bool {
    let paths = FfmpegPaths::default();
    let found = locate_binary(BinaryName::Ffmpeg, &paths).is_ok()
        && locate_binary(BinaryName::Ffprobe, &paths).is_ok();
    if !found {
        eprintln!(
            "skipping: ffmpeg or ffprobe was not found; set EASYIMMERSE_FFMPEG_DIR to run this test"
        );
    }
    found
}

async fn spawn_server_with(
    allow_local_paths: bool,
    conversions: Option<ConversionService>,
) -> TestServer {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("a free loopback port");
    let port = listener.local_addr().expect("a bound address").port();
    let storage = Storage::open_in_memory().expect("an in-memory database");
    storage
        .seed_placeholder_projects()
        .expect("placeholder projects");
    let config = ApiConfig::for_loopback(port, TOKEN.to_string(), allow_local_paths);
    let state = AppState::new(storage, config).with_conversions(conversions);
    let handle = serve(listener, state).await.expect("the server to start");
    TestServer {
        base_url: format!("http://127.0.0.1:{port}"),
        token: TOKEN.to_string(),
        handle,
    }
}

pub fn fixture_path(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures")
        .join(name)
}

pub fn read_fixture(name: &str) -> Vec<u8> {
    std::fs::read(fixture_path(name)).expect("fixture should be readable")
}

impl TestServer {
    pub fn request(&self, method: &'static str, path: &str) -> TestRequest {
        TestRequest {
            method,
            url: format!("{}{path}", self.base_url),
            headers: vec![(
                "Authorization".to_string(),
                format!("Bearer {}", self.token),
            )],
            body: Vec::new(),
        }
    }

    pub async fn get(&self, path: &str) -> TestResponse {
        self.request("GET", path).send().await
    }

    pub async fn post_json(&self, path: &str, body: &Value) -> TestResponse {
        self.request("POST", path).json(body).send().await
    }

    pub async fn put_json(&self, path: &str, body: &Value) -> TestResponse {
        self.request("PUT", path).json(body).send().await
    }

    pub async fn delete(&self, path: &str) -> TestResponse {
        self.request("DELETE", path).send().await
    }

    /// Creates a project with the intermediate flashcard settings and returns its id.
    pub async fn create_project(&self) -> String {
        let response = self
            .post_json("/projects", &project_settings("Krimi"))
            .await;
        id_of(&response)
    }

    /// Registers a fixture as a media file in a new project and returns the media file's path on the server.
    pub async fn add_fixture_media(&self, fixture: &str) -> String {
        let project_id = self.create_project().await;
        let media_id = self
            .add_media(&project_id, fixture, path_source(fixture))
            .await;
        format!("/projects/{project_id}/media/{media_id}")
    }

    /// Plans playback of a media file for a browser that accepts its tracks' codecs and AAC in fragmented MP4.
    pub async fn plan_playback(
        &self,
        media_path: &str,
        engine: &str,
        direct_play: bool,
    ) -> TestResponse {
        let environment = json!({
            "engine": engine,
            "direct_play": direct_play,
            "fmp4_codecs": self.fmp4_codecs(media_path).await,
        });
        self.post_json(
            &format!("{media_path}/playback"),
            &json!({ "environment": environment }),
        )
        .await
    }

    async fn fmp4_codecs(&self, media_path: &str) -> Vec<Value> {
        let tracks = self.get(&format!("{media_path}/tracks")).await.json();
        let mut codecs: Vec<Value> = tracks["container"]["tracks"]
            .as_array()
            .expect("a track list")
            .iter()
            .map(|track| track["codec_string"].clone())
            .filter(Value::is_string)
            .collect();
        codecs.push(json!(AAC_CODEC));
        codecs
    }

    /// Registers a media file in a project and returns its id.
    pub async fn add_media(&self, project_id: &str, name: &str, source: Value) -> String {
        let body = json!({ "name": name, "kind": "video", "source": source });
        let response = self
            .post_json(&format!("/projects/{project_id}/media"), &body)
            .await;
        id_of(&response)
    }

    pub async fn post_bytes(&self, path: &str, content_type: &str, body: Vec<u8>) -> TestResponse {
        self.request("POST", path)
            .header("Content-Type", content_type)
            .body(body)
            .send()
            .await
    }
}

impl TestRequest {
    pub fn without_token(mut self) -> Self {
        self.headers.retain(|(name, _)| name != "Authorization");
        self
    }

    pub fn header(mut self, name: &str, value: &str) -> Self {
        self.headers.push((name.to_string(), value.to_string()));
        self
    }

    pub fn body(mut self, body: Vec<u8>) -> Self {
        self.body = body;
        self
    }

    pub fn json(self, value: &Value) -> Self {
        self.header("Content-Type", "application/json")
            .body(value.to_string().into_bytes())
    }

    pub async fn send(self) -> TestResponse {
        tokio::task::spawn_blocking(move || self.send_blocking())
            .await
            .expect("the request task should not panic")
    }

    fn send_blocking(self) -> TestResponse {
        let agent: Agent = Agent::config_builder()
            .http_status_as_error(false)
            .build()
            .into();
        let mut builder = Request::builder().method(self.method).uri(&self.url);
        for (name, value) in &self.headers {
            builder = builder.header(name, value);
        }
        let request = builder.body(self.body).expect("a well-formed request");
        let mut response = agent.run(request).expect("the request should be sent");
        TestResponse {
            status: response.status().as_u16(),
            headers: response
                .headers()
                .iter()
                .map(|(name, value)| {
                    let value = value.to_str().unwrap_or_default();
                    (name.to_string(), value.to_string())
                })
                .collect(),
            bytes: response.body_mut().read_to_vec().expect("a readable body"),
        }
    }
}

pub fn project_settings(name: &str) -> Value {
    json!({
        "name": name,
        "target_language": "de",
        "translation_language": "en",
        "flashcard_settings": {
            "included_fields": ["word", "l1_definition", "context", "context_translation", "context_audio", "screenshot"],
            "default_tags": [],
            "tag_with_media_name": true,
            "use_tts_when_no_audio": false
        }
    })
}

pub fn path_source(fixture: &str) -> Value {
    json!({ "kind": "path", "path": fixture_path(fixture) })
}

pub fn browser_source() -> Value {
    json!({ "kind": "browser_file", "key": "browser-key" })
}

pub fn id_of(response: &TestResponse) -> String {
    response.json()["id"]
        .as_str()
        .expect("the response should carry an id")
        .to_string()
}
