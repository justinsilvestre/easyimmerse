//! Starts the API on a free loopback port and sends requests to it with a blocking client.

#![allow(dead_code)]

use std::path::{Path, PathBuf};
use std::process::Command;

use easyimmerse_api::mail::{OutgoingMail, RecordedMails};
use easyimmerse_api::{
    API_PATH_PREFIX, AccountsConfig, ApiConfig, MailConfig, MailTransport, ServeOptions,
    ServerHandle, serve,
};
use easyimmerse_core::project::ProjectId;
use easyimmerse_media_ffmpeg::{BinaryName, FfmpegPaths, locate_binary};
use easyimmerse_storage::{OwnerId, Storage};
use serde_json::Value;
use tempfile::TempDir;
use tokio::net::TcpListener;
use ureq::Agent;
use ureq::http::Request;

pub const TOKEN: &str = "test-token";

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

    pub fn text(&self) -> String {
        String::from_utf8_lossy(&self.bytes).into_owned()
    }

    /// The first value of a header, compared by name without regard to case.
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
    spawn_test_server_with_storage(allow_local_paths, seeded_storage()).await
}

/// An in-memory database holding the two placeholder projects.
pub fn seeded_storage() -> Storage {
    let storage = Storage::open_in_memory().expect("an in-memory database");
    seed_known_placeholder_projects(&storage);
    storage
}

/// Gives the launch owner the placeholder projects under the ids `placeholder-1` and `placeholder-2`, which the tests name.
pub fn seed_known_placeholder_projects(storage: &Storage) {
    let ids = ["placeholder-1", "placeholder-2"].map(|id| ProjectId(id.to_string()));
    storage
        .seed_placeholder_projects_with_ids(&OwnerId::launch(), &ids)
        .expect("placeholder projects");
}

pub async fn spawn_test_server_with_storage(
    allow_local_paths: bool,
    storage: Storage,
) -> TestServer {
    spawn_test_server_with_options(allow_local_paths, storage, ServeOptions::default()).await
}

/// A server with a fresh conversion cache directory, which lives as long as the returned
/// `TempDir`.
pub async fn spawn_test_server_with_cache(allow_local_paths: bool) -> (TestServer, TempDir) {
    let cache_dir = TempDir::new().expect("a cache directory");
    let options = ServeOptions {
        cache_dir: Some(cache_dir.path().to_path_buf()),
        ..ServeOptions::default()
    };
    let server = spawn_test_server_with_options(allow_local_paths, seeded_storage(), options).await;
    (server, cache_dir)
}

pub async fn spawn_test_server_with_options(
    allow_local_paths: bool,
    storage: Storage,
    options: ServeOptions,
) -> TestServer {
    spawn_configured_test_server(
        |port| ApiConfig::for_loopback(port, TOKEN.to_string(), allow_local_paths),
        storage,
        options,
    )
    .await
}

/// A server that has accounts as well as the launch token, which the requests present by default.
/// It allows local paths, so that tests can tell that only the launch token may read them.
pub async fn spawn_test_server_with_accounts(open_signup: bool) -> TestServer {
    spawn_test_server_with_accounts_on(seeded_storage(), open_signup).await
}

pub async fn spawn_test_server_with_accounts_on(storage: Storage, open_signup: bool) -> TestServer {
    let configure = |port| ApiConfig {
        accounts: Some(AccountsConfig { open_signup }),
        ..ApiConfig::for_loopback(port, TOKEN.to_string(), true)
    };
    spawn_configured_test_server(configure, storage, ServeOptions::default()).await
}

/// Where the mailed links of a test server point.
pub const PUBLIC_URL: &str = "https://app.example.com/web";

/// A server with open sign-up that sends its mail to the returned recording, besides the launch token.
pub async fn spawn_test_server_with_mail() -> (TestServer, RecordedMails) {
    let recorded = RecordedMails::default();
    let mail = MailConfig {
        transport: MailTransport::Recording(recorded.clone()),
        from_address: "easyImmerse <accounts@example.com>".to_string(),
        public_url: PUBLIC_URL.to_string(),
    };
    let configure = |port| ApiConfig {
        accounts: Some(AccountsConfig { open_signup: true }),
        mail: Some(mail),
        ..ApiConfig::for_loopback(port, TOKEN.to_string(), true)
    };
    let server =
        spawn_configured_test_server(configure, seeded_storage(), ServeOptions::default()).await;
    (server, recorded)
}

/// The recorded mails once there are `count` of them, which the server sends in the background,
/// or what there is after two seconds.
pub async fn wait_for_mails(recorded: &RecordedMails, count: usize) -> Vec<OutgoingMail> {
    for _ in 0..100 {
        if recorded.sent().len() >= count {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(20)).await;
    }
    recorded.sent()
}

/// The recorded mail that holds a link with the query parameter, such as `reset_password`,
/// whatever the order in which the server's background tasks recorded the mails.
pub fn mail_with_link<'a>(mails: &'a [OutgoingMail], parameter: &str) -> &'a OutgoingMail {
    let prefix = format!("{PUBLIC_URL}/?{parameter}=");
    mails
        .iter()
        .find(|mail| mail.text.contains(&prefix))
        .unwrap_or_else(|| panic!("a recorded mail with a `{parameter}` link"))
}

/// The token of the link in the mail that names the query parameter, such as `confirm_email`.
pub fn link_token(mail: &OutgoingMail, parameter: &str) -> String {
    let prefix = format!("{PUBLIC_URL}/?{parameter}=");
    let start = mail.text.find(&prefix).expect("a link in the mail") + prefix.len();
    mail.text[start..start + 64].to_string()
}

/// Starts a server with the configuration that `configure` builds for its port.
pub async fn spawn_configured_test_server(
    configure: impl FnOnce(u16) -> ApiConfig,
    storage: Storage,
    options: ServeOptions,
) -> TestServer {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("a free loopback port");
    let port = listener.local_addr().expect("a bound address").port();
    let handle = serve(listener, configure(port), storage, options)
        .await
        .expect("the server to start");
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

/// Whether ffmpeg and ffprobe can be found, for tests that skip without them.
pub fn ffmpeg_available() -> bool {
    let paths = FfmpegPaths::default();
    let available = locate_binary(BinaryName::Ffmpeg, &paths).is_ok()
        && locate_binary(BinaryName::Ffprobe, &paths).is_ok();
    if !available {
        eprintln!("skipped: ffmpeg or ffprobe not found");
    }
    available
}

/// Whether the given ffmpeg binary lists a SubRip muxer, which extracting embedded subtitles needs.
pub fn has_srt_muxer(ffmpeg: &Path) -> bool {
    Command::new(ffmpeg)
        .args(["-hide_banner", "-muxers"])
        .output()
        .is_ok_and(|output| lists_srt_muxer(&String::from_utf8_lossy(&output.stdout)))
}

/// Reads the output of `ffmpeg -muxers`, whose lines hold the capability flags, then the name.
fn lists_srt_muxer(muxers: &str) -> bool {
    muxers
        .lines()
        .any(|line| line.split_whitespace().nth(1) == Some("srt"))
}

impl TestServer {
    /// A request to an API path, such as `/projects`, which the server serves under its API path prefix.
    pub fn request(&self, method: &'static str, path: &str) -> TestRequest {
        self.web_app_request(method, &format!("{API_PATH_PREFIX}{path}"))
    }

    /// A request to a path outside the API, where the server serves the web app's files.
    pub fn web_app_request(&self, method: &'static str, path: &str) -> TestRequest {
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

    pub async fn post_bytes(&self, path: &str, content_type: &str, body: Vec<u8>) -> TestResponse {
        self.request("POST", path)
            .header("Content-Type", content_type)
            .body(body)
            .send()
            .await
    }
}

impl TestRequest {
    /// A request without a token to a server that a test started on its own.
    pub fn to(method: &'static str, url: String) -> Self {
        Self {
            method,
            url,
            headers: Vec::new(),
            body: Vec::new(),
        }
    }

    pub fn without_token(mut self) -> Self {
        self.headers.retain(|(name, _)| name != "Authorization");
        self
    }

    /// Presents `token` instead of the test token.
    pub fn with_token(self, token: &str) -> Self {
        self.without_token()
            .header("Authorization", &format!("Bearer {token}"))
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
        let headers = response
            .headers()
            .iter()
            .map(|(name, value)| {
                (
                    name.to_string(),
                    String::from_utf8_lossy(value.as_bytes()).into_owned(),
                )
            })
            .collect();
        TestResponse {
            status: response.status().as_u16(),
            headers,
            bytes: response.body_mut().read_to_vec().expect("a readable body"),
        }
    }
}
