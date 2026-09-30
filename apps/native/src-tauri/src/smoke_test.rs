//! The health check CI runs after building the app.
//!
//! When `EASYIMMERSE_SMOKE_TEST=1` is set, the app starts its embedded server, requests
//! `/health`, prints the result, and exits without creating a window, so no display is needed
//! for the request itself. On Linux, `tauri::Builder::run` still initializes GTK before
//! `setup` runs, and GTK refuses to start without a display, which is why the CI job wraps the
//! binary in `xvfb-run` there.

use thiserror::Error;

use crate::embedded_server::EmbeddedServer;

const ENV_VAR: &str = "EASYIMMERSE_SMOKE_TEST";
const EXPECTED_BODY: &str = r#"{"status":"ok"}"#;

#[derive(Debug, Error)]
enum SmokeTestError {
    #[error("the health request failed: {0}")]
    Request(#[from] ureq::Error),
    #[error("unexpected health response: {status} {body}")]
    Unexpected { status: u16, body: String },
}

pub fn is_requested() -> bool {
    std::env::var(ENV_VAR).is_ok_and(|value| value == "1")
}

/// Checks the server's health and ends the process: exit code 0 on success, 1 otherwise.
pub fn run_and_exit(server: &EmbeddedServer) -> ! {
    match check_health(server) {
        Ok(()) => std::process::exit(0),
        Err(error) => {
            println!("smoke test failed: {error}");
            std::process::exit(1)
        }
    }
}

fn check_health(server: &EmbeddedServer) -> Result<(), SmokeTestError> {
    let mut response = ureq::get(format!("{}/health", server.url))
        .header("authorization", format!("Bearer {}", server.token))
        .call()?;
    let status = response.status().as_u16();
    let body = response.body_mut().read_to_string()?;
    println!("smoke test: {status} {body}");
    if status == 200 && body == EXPECTED_BODY {
        Ok(())
    } else {
        Err(SmokeTestError::Unexpected { status, body })
    }
}
