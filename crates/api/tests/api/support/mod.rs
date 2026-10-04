//! Starts the API on a free loopback port and sends requests to it with a blocking client.

#![allow(dead_code)]

use std::path::PathBuf;

use easyimmerse_api::{ApiConfig, ServeOptions, ServerHandle, serve};
use easyimmerse_storage::Storage;
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
    storage
        .seed_placeholder_projects()
        .expect("placeholder projects");
    storage
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
    };
    let server = spawn_test_server_with_options(allow_local_paths, seeded_storage(), options).await;
    (server, cache_dir)
}

pub async fn spawn_test_server_with_options(
    allow_local_paths: bool,
    storage: Storage,
    options: ServeOptions,
) -> TestServer {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("a free loopback port");
    let port = listener.local_addr().expect("a bound address").port();
    let config = ApiConfig::for_loopback(port, TOKEN.to_string(), allow_local_paths);
    let handle = serve(listener, config, storage, options)
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
