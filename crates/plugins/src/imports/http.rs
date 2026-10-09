mod stall_timeout;

use std::time::Duration;

use easyimmerse_plugin_api::base::easyimmerse::plugin::http::{Host, HttpResponse};
use easyimmerse_plugin_api::base::easyimmerse::plugin::types::PluginError;
use ureq::unversioned::resolver::DefaultResolver;
use ureq::unversioned::transport::{Connector, DefaultConnector};

use crate::grants::CapabilityGrants;
use crate::host_state::HostState;
use crate::imports::download::download;
use crate::imports::http::stall_timeout::StallTimeoutConnector;

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
        Ok(download(&self.grants, self.download, &url, &path))
    }
}

pub(super) fn check_host(grants: &CapabilityGrants, url: &str) -> Result<(), PluginError> {
    if grants.is_host_allowed(url) {
        return Ok(());
    }
    Err(PluginError::NotPermitted(format!(
        "{url} is not on the plugin's allowed hosts"
    )))
}

/// Performs one GET request and reads the body into memory.
fn fetch(url: &str) -> Result<HttpResponse, ureq::Error> {
    let mut response = agent(None).get(url).call()?;
    let status = response.status().as_u16();
    let body = response
        .body_mut()
        .with_config()
        .limit(MAX_BODY_BYTES)
        .read_to_vec()?;
    Ok(HttpResponse { status, body })
}

/// An agent that hands back every status as a response and follows no redirects,
/// because a redirect target has not been checked against the allowed hosts.
/// Given a `stall_timeout`, it gives up on connecting, and on any wait for incoming bytes,
/// once that much time passes without progress.
/// The wait is bounded for each read, so a long transfer that keeps receiving bytes is never cut off.
pub(super) fn agent(stall_timeout: Option<Duration>) -> ureq::Agent {
    let config = ureq::config::Config::builder()
        .http_status_as_error(false)
        .max_redirects(0)
        .timeout_connect(stall_timeout)
        .build();
    match stall_timeout {
        Some(timeout) => {
            let connector = DefaultConnector::new().chain(StallTimeoutConnector(timeout));
            ureq::Agent::with_parts(config, connector, DefaultResolver::default())
        }
        None => config.new_agent(),
    }
}

pub(super) fn check_status(url: &str, status: u16) -> Result<(), PluginError> {
    match status {
        200..=299 => Ok(()),
        404 => Err(PluginError::NotFound(format!("{url} answered 404"))),
        _ => Err(PluginError::Io(format!("{url} answered {status}"))),
    }
}

pub(super) fn to_io_error(error: impl ToString) -> PluginError {
    PluginError::Io(error.to_string())
}
