use std::path::{Path, PathBuf};

/// Returns the absolute path of a file in the repository's `fixtures` directory.
pub fn fixture_path(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures")
        .join(name)
}

pub fn read_fixture_text(name: &str) -> String {
    std::fs::read_to_string(fixture_path(name)).expect("fixture should be readable as text")
}

pub fn read_fixture_bytes(name: &str) -> Vec<u8> {
    std::fs::read(fixture_path(name)).expect("fixture should be readable")
}
