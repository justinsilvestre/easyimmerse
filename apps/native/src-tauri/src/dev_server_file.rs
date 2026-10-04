//! Shares the embedded server's address, token, database, and cache directory with the web app's development tasks, so a browser can use the desktop app's data during development.
//! Only debug desktop builds write the file. The file lives in the repository's git-ignored `.dev/` directory.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;

use crate::embedded_server::EmbeddedServer;

const DEV_SERVER_FILE: &str = ".dev/desktop-server.env";

/// Writes the server's address, token, and storage paths to `.dev/desktop-server.env` in debug builds, for `mise run web:desktop` to read.
/// A failure is only logged, because the app works without the file.
pub fn write_in_debug_builds(server: &EmbeddedServer) {
    if !cfg!(debug_assertions) {
        return;
    }
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../..")
        .join(DEV_SERVER_FILE);
    if let Err(error) = write_owner_only(&path, &env_file_contents(server)) {
        tracing::warn!("could not write {}: {error}", path.display());
    }
}

/// Formats shell variable assignments.
fn env_file_contents(server: &EmbeddedServer) -> String {
    let assignments = [
        ("EASYIMMERSE_DESKTOP_SERVER_URL", server.url.clone()),
        ("EASYIMMERSE_DESKTOP_TOKEN", server.token.clone()),
        (
            "EASYIMMERSE_DESKTOP_DATABASE",
            path_text(&server.database_path),
        ),
        (
            "EASYIMMERSE_DESKTOP_CACHE_DIR",
            path_text(&server.cache_dir),
        ),
    ];
    assignments
        .iter()
        .map(|(name, value)| format!("{name}={}\n", shell_quote(value)))
        .collect()
}

fn path_text(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

/// Wraps a value in single quotes, which the shell reads literally, so paths with spaces survive.
fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', r"'\''"))
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
    fn quotes_a_value_with_spaces() {
        assert_eq!(
            shell_quote("/Users/a/Library/Application Support/x.sqlite"),
            "'/Users/a/Library/Application Support/x.sqlite'"
        );
    }

    #[test]
    fn escapes_a_single_quote() {
        assert_eq!(shell_quote("it's"), r"'it'\''s'");
    }
}
