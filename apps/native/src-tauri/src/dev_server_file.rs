//! Shares the embedded server's address and token with the web app's development server, so a browser can use the desktop app's data during development.
//! Only debug desktop builds write the file. The file lives in the repository's git-ignored `.dev/` directory.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;

use crate::embedded_server::EmbeddedServer;

const DEV_SERVER_FILE: &str = ".dev/desktop-server.env";

/// Writes the server's address and token to `.dev/desktop-server.env` in debug builds, for `mise run web:desktop` to read.
/// A failure is only logged, because the app works without the file.
pub fn write_in_debug_builds(server: &EmbeddedServer) {
    if !cfg!(debug_assertions) {
        return;
    }
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../..")
        .join(DEV_SERVER_FILE);
    if let Err(error) = write_owner_only(&path, &env_file_contents(&server.url, &server.token)) {
        tracing::warn!("could not write {}: {error}", path.display());
    }
}

/// Formats shell variable assignments. The address and the hex token contain no characters that need quoting.
fn env_file_contents(url: &str, token: &str) -> String {
    format!("EASYIMMERSE_DESKTOP_SERVER_URL={url}\nEASYIMMERSE_DESKTOP_TOKEN={token}\n")
}

/// Writes the file so that only the current user can read it, since it holds the API token.
fn write_owner_only(path: &Path, contents: &str) -> std::io::Result<()> {
    if let Some(directory) = path.parent() {
        std::fs::create_dir_all(directory)?;
    }
    let mut options = OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    std::os::unix::fs::OpenOptionsExt::mode(&mut options, 0o600);
    options.open(path)?.write_all(contents.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn assigns_the_address_and_the_token() {
        assert_eq!(
            env_file_contents("http://127.0.0.1:8787", "abc"),
            "EASYIMMERSE_DESKTOP_SERVER_URL=http://127.0.0.1:8787\nEASYIMMERSE_DESKTOP_TOKEN=abc\n"
        );
    }
}
