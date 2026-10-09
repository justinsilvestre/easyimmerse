use crate::easyimmerse::plugin::{http, run_command, types::PluginError};

/// Asks the host to run a command, discarding its output. The host tests use
/// this to check that only bundled executables are permitted.
pub fn try_run(command: &str) -> Result<(), PluginError> {
    run_command::run(command, &[]).map(|_| ())
}

/// Asks the host to fetch a URL, discarding the response. The host tests use
/// this to check that only allowlisted hosts are permitted.
pub fn try_get(url: &str) -> Result<(), PluginError> {
    http::get(url).map(|_| ())
}

/// Asks the host to download a URL into a file. The host tests use this to
/// check that only allowlisted hosts and granted paths are permitted.
pub fn try_download(url: &str, path: &str) -> Result<u64, PluginError> {
    http::download(url, path)
}
