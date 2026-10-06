//! Reading a table dictionary picked by its path: the picked file alone, without the siblings that share its stem.

use std::fs::File;
use std::io::{self, Read};
use std::path::Path;

use easyimmerse_core::dictionary::SourceFile;

/// Extensions of the files that hold a table dictionary on their own.
const TABLE_EXTENSIONS: &[&str] = &["csv", "tsv", "tab", "txt"];

/// How much of a table a preview reads, which covers its first rows many times over.
pub const PREVIEW_BYTES: u64 = 512 * 1024;

/// Tells whether a path names a table file, which is read on its own rather than with the siblings that share its stem.
pub fn is_table_file(path: &Path) -> bool {
    path.extension()
        .map(|extension| extension.to_string_lossy().to_ascii_lowercase())
        .is_some_and(|extension| TABLE_EXTENSIONS.contains(&extension.as_str()))
}

/// Reads a table file, whole or only its start up to `limit` bytes, cut after the last complete line.
pub fn read_table_file(path: &Path, limit: Option<u64>) -> io::Result<SourceFile> {
    let mut bytes = Vec::new();
    let file = File::open(path)?;
    match limit {
        Some(limit) => {
            let read = file.take(limit + 1).read_to_end(&mut bytes)?;
            if read as u64 > limit {
                bytes = whole_lines(&bytes[..limit as usize]).to_vec();
            }
        }
        None => {
            let mut file = file;
            file.read_to_end(&mut bytes)?;
        }
    }
    let name = path
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default();
    Ok(SourceFile { name, bytes })
}

/// The bytes up to and including the last line break, or all of them when there is none.
fn whole_lines(bytes: &[u8]) -> &[u8] {
    match bytes.iter().rposition(|&byte| byte == b'\n') {
        Some(end) => &bytes[..=end],
        None => bytes,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_a_tabfile_as_a_table() {
        assert!(is_table_file(Path::new("/d/Wörter.TAB")));
    }

    #[test]
    fn does_not_count_an_archive_as_a_table() {
        assert!(!is_table_file(Path::new("/d/words.zip")));
    }

    #[test]
    fn cuts_a_long_table_after_its_last_complete_line() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("words.csv");
        std::fs::write(&path, "Hund;dog\nKatze;cat\nMaus;mouse\n").unwrap();
        let file = read_table_file(&path, Some(14)).unwrap();
        assert_eq!(file.bytes, b"Hund;dog\n");
    }

    #[test]
    fn reads_a_short_table_whole() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("words.csv");
        std::fs::write(&path, "Hund;dog\nKatze;cat").unwrap();
        let file = read_table_file(&path, Some(1024)).unwrap();
        assert_eq!(file.bytes, b"Hund;dog\nKatze;cat");
    }
}
