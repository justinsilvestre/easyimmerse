use std::fs::File;
use std::io::Read;
use std::path::Path;

use easyimmerse_plugin_api::base::easyimmerse::plugin::http::{Host, HttpResponse};
use easyimmerse_plugin_api::base::easyimmerse::plugin::types::PluginError;

use crate::grants::CapabilityGrants;
use crate::host_state::HostState;
use crate::imports::to_guest_error;

/// The largest response body the host passes to a plugin.
const MAX_BODY_BYTES: u64 = 256 * 1024 * 1024;

impl Host for HostState {
    fn get(&mut self, url: String) -> wasmtime::Result<Result<HttpResponse, PluginError>> {
        Ok(check_host(&self.grants, &url).and_then(|()| fetch(&url).map_err(to_io_error)))
    }

    fn download(
        &mut self,
        url: String,
        path: String,
    ) -> wasmtime::Result<Result<u64, PluginError>> {
        Ok(download(&self.grants, &url, &path))
    }
}

fn check_host(grants: &CapabilityGrants, url: &str) -> Result<(), PluginError> {
    if grants.is_host_allowed(url) {
        return Ok(());
    }
    Err(PluginError::NotPermitted(format!(
        "{url} is not on the plugin's allowed hosts"
    )))
}

/// Checks the URL and the path before sending the request, so a refused
/// download touches neither the network nor the file system.
fn download(grants: &CapabilityGrants, url: &str, path: &str) -> Result<u64, PluginError> {
    check_host(grants, url)?;
    let resolved = grants.resolve_granted_path(path).map_err(to_guest_error)?;
    let mut response = agent().get(url).call().map_err(to_io_error)?;
    check_status(url, response.status().as_u16())?;
    write_body(response.body_mut().as_reader(), &resolved)
}

/// Performs one GET request and reads the body into memory.
fn fetch(url: &str) -> Result<HttpResponse, ureq::Error> {
    let mut response = agent().get(url).call()?;
    let status = response.status().as_u16();
    let body = response
        .body_mut()
        .with_config()
        .limit(MAX_BODY_BYTES)
        .read_to_vec()?;
    Ok(HttpResponse { status, body })
}

/// An agent that hands back every status as a response. It follows no
/// redirects, because the redirect target has not been checked against the
/// allowed hosts.
fn agent() -> ureq::Agent {
    ureq::config::Config::builder()
        .http_status_as_error(false)
        .max_redirects(0)
        .build()
        .new_agent()
}

fn check_status(url: &str, status: u16) -> Result<(), PluginError> {
    match status {
        200..=299 => Ok(()),
        404 => Err(PluginError::NotFound(format!("{url} answered 404"))),
        _ => Err(PluginError::Io(format!("{url} answered {status}"))),
    }
}

/// Streams `body` into the file at `path`, removing the file if the transfer fails.
fn write_body(mut body: impl Read, path: &Path) -> Result<u64, PluginError> {
    let mut file = File::create(path).map_err(to_io_error)?;
    let written = std::io::copy(&mut body, &mut file);
    if written.is_err() {
        let _ = std::fs::remove_file(path);
    }
    written.map_err(to_io_error)
}

fn to_io_error(error: impl ToString) -> PluginError {
    PluginError::Io(error.to_string())
}
