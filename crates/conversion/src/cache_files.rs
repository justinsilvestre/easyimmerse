//! File operations that put a file into the cache without ever replacing a file already there.

use std::io::ErrorKind;
use std::path::Path;

/// Moves a file within one filesystem unless the destination exists. Creating a hard link fails rather than replacing an existing file.
pub async fn move_without_replacing(from: &Path, to: &Path) -> Result<(), std::io::Error> {
    match tokio::fs::hard_link(from, to).await {
        Err(error) if error.kind() != ErrorKind::AlreadyExists => Err(error),
        _ => tokio::fs::remove_file(from).await,
    }
}

/// Copies a file, which ffmpeg may still rewrite, through a temporary file so that the destination appears complete or not at all.
pub async fn copy_without_replacing(
    from: &Path,
    temporary: &Path,
    to: &Path,
) -> Result<(), std::io::Error> {
    tokio::fs::copy(from, temporary).await?;
    move_without_replacing(temporary, to).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn keeps_the_file_already_at_the_destination() {
        let dir = tempfile::tempdir().expect("temp dir");
        let (from, to) = (dir.path().join("new"), dir.path().join("cached"));
        std::fs::write(&from, "new").expect("write new");
        std::fs::write(&to, "cached").expect("write cached");
        move_without_replacing(&from, &to).await.expect("move");
        assert_eq!(std::fs::read_to_string(&to).ok(), Some("cached".to_owned()));
    }

    #[tokio::test]
    async fn removes_the_moved_file_when_the_destination_exists() {
        let dir = tempfile::tempdir().expect("temp dir");
        let (from, to) = (dir.path().join("new"), dir.path().join("cached"));
        std::fs::write(&from, "new").expect("write new");
        std::fs::write(&to, "cached").expect("write cached");
        move_without_replacing(&from, &to).await.expect("move");
        assert!(!from.exists());
    }

    #[tokio::test]
    async fn moves_a_file_to_a_free_destination() {
        let dir = tempfile::tempdir().expect("temp dir");
        let (from, to) = (dir.path().join("new"), dir.path().join("cached"));
        std::fs::write(&from, "new").expect("write new");
        move_without_replacing(&from, &to).await.expect("move");
        assert_eq!(std::fs::read_to_string(&to).ok(), Some("new".to_owned()));
    }
}
