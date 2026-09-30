use easyimmerse_plugin_api::base::easyimmerse::plugin::http::{Host, HttpResponse};
use easyimmerse_plugin_api::base::easyimmerse::plugin::types::PluginError;

use crate::host_state::HostState;

/// The largest response body the host passes to a plugin.
const MAX_BODY_BYTES: u64 = 256 * 1024 * 1024;

impl Host for HostState {
    fn get(&mut self, url: String) -> wasmtime::Result<Result<HttpResponse, PluginError>> {
        if !self.grants.is_host_allowed(&url) {
            return Ok(Err(PluginError::NotPermitted(format!(
                "{url} is not on the plugin's allowed hosts"
            ))));
        }
        Ok(fetch(&url).map_err(|error| PluginError::Io(error.to_string())))
    }
}

/// Performs one GET request. Redirects are not followed, because the redirect
/// target has not been checked against the allowed hosts.
fn fetch(url: &str) -> Result<HttpResponse, ureq::Error> {
    let agent = ureq::config::Config::builder()
        .http_status_as_error(false)
        .max_redirects(0)
        .build()
        .new_agent();
    let mut response = agent.get(url).call()?;
    let status = response.status().as_u16();
    let body = response
        .body_mut()
        .with_config()
        .limit(MAX_BODY_BYTES)
        .read_to_vec()?;
    Ok(HttpResponse { status, body })
}
