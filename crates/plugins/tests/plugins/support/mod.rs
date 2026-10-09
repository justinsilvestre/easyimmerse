//! Shared setup for the tests that load built plugins.

#![allow(dead_code)]

use std::path::{Path, PathBuf};
use std::sync::Arc;

use easyimmerse_plugins::ExecutionMode;
use tiny_http::{Header, Request, Response, Server};

/// The `dist/` directory of a plugin under `plugins/`, built by `mise run plugins:build`.
pub fn built_plugin_dir(name: &str) -> PathBuf {
    let dir = repo_root().join("plugins").join(name).join("dist");
    assert!(
        dir.join("plugin.wasm").is_file(),
        "{} is missing; run `mise run plugins:build` first",
        dir.join("plugin.wasm").display()
    );
    dir
}

/// The `bin/<target>/` directory in a plugin's source tree, granted to the plugin
/// under test.
pub fn source_bin_dir(name: &str) -> Option<PathBuf> {
    let target = easyimmerse_plugins::current_target_name()?;
    let dir = repo_root()
        .join("plugins")
        .join(name)
        .join("bin")
        .join(target);
    dir.is_dir().then_some(dir)
}

pub fn fixtures_dir() -> PathBuf {
    repo_root().join("fixtures")
}

/// The execution mode under test, so the interpreter CI leg reuses the same tests.
pub fn execution_mode() -> ExecutionMode {
    ExecutionMode::from_env()
}

/// An HTTP server on the loopback interface. It stops when dropped.
pub struct LoopbackServer {
    pub base_url: String,
    server: Arc<Server>,
}

impl Drop for LoopbackServer {
    fn drop(&mut self) {
        self.server.unblock();
    }
}

/// Starts a loopback server that answers its requests with `respond`,
/// one after another on a single background thread.
pub fn start_http_server(respond: impl Fn(Request) + Send + 'static) -> LoopbackServer {
    let server = Arc::new(Server::http("127.0.0.1:0").expect("bind a loopback port"));
    let port = server.server_addr().to_ip().expect("an IP address").port();
    let served = Arc::clone(&server);
    std::thread::spawn(move || served.incoming_requests().for_each(respond));
    LoopbackServer {
        base_url: format!("http://127.0.0.1:{port}"),
        server,
    }
}

/// Starts a loopback server serving the files under `fixtures/`.
pub fn start_fixture_http_server() -> LoopbackServer {
    let root = fixtures_dir();
    start_http_server(move |request| {
        let response = fixture_response(&root, request.url());
        let _ = request.respond(response);
    })
}

fn fixture_response(root: &Path, url: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let relative = url.trim_start_matches('/');
    match std::fs::read(root.join(relative)) {
        Ok(bytes) => Response::from_data(bytes).with_header(octet_stream_header()),
        Err(_) => Response::from_string("not found").with_status_code(404),
    }
}

fn octet_stream_header() -> Header {
    Header::from_bytes("Content-Type", "application/octet-stream").expect("a valid header")
}

fn repo_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("..").join("..")
}
