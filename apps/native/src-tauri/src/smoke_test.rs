//! The health check CI runs after building the app.
//!
//! When `EASYIMMERSE_SMOKE_TEST=1` is set, the app starts its embedded server, requests
//! `/health`, prints the result, and exits without creating a window, so no display is needed
//! for the request itself. A build with the `plugin-check` feature also runs the plugin host
//! check and prints what it found. On Linux, `tauri::Builder::run` still initializes GTK before
//! `setup` runs, and GTK refuses to start without a display, which is why the CI job wraps the
//! binary in `xvfb-run` there.

use tauri::AppHandle;
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
    #[cfg(feature = "plugin-check")]
    #[error("the plugin host check failed: {0}")]
    PluginCheck(#[from] crate::plugin_check::PluginCheckError),
}

pub fn is_requested() -> bool {
    std::env::var(ENV_VAR).is_ok_and(|value| value == "1")
}

/// Runs the checks and ends the process: exit code 0 on success, 1 otherwise.
pub fn run_and_exit(app: &AppHandle, server: &EmbeddedServer) -> ! {
    match run_checks(app, server) {
        Ok(()) => std::process::exit(0),
        Err(error) => {
            println!("smoke test failed: {error}");
            std::process::exit(1)
        }
    }
}

fn run_checks(app: &AppHandle, server: &EmbeddedServer) -> Result<(), SmokeTestError> {
    check_health(server)?;
    check_plugin_host(app)
}

#[cfg(feature = "plugin-check")]
fn check_plugin_host(app: &AppHandle) -> Result<(), SmokeTestError> {
    let found = crate::plugin_check::run(app)?;
    println!(
        "smoke test: the plugin host greeted {:?} in {} mode",
        found.greeting, found.execution_mode
    );
    Ok(())
}

#[cfg(not(feature = "plugin-check"))]
fn check_plugin_host(_app: &AppHandle) -> Result<(), SmokeTestError> {
    Ok(())
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
