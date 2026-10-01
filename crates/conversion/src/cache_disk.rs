//! Blocking file system queries and removals for the conversion cache.

use std::io::ErrorKind;
use std::path::Path;

use crate::cache_limit::DiskSpace;

/// Returns the size of the disk that holds `path` and the space on it available to this process.
pub fn disk_space(path: &Path) -> std::io::Result<DiskSpace> {
    let stats = fs4::statvfs(path)?;
    Ok(DiskSpace {
        capacity: stats.total_space(),
        free: stats.available_space(),
    })
}

/// Returns the total size of the files in a directory and its subdirectories.
/// Files removed while it runs are not counted.
pub fn directory_size(dir: &Path) -> std::io::Result<u64> {
    let mut size = 0;
    for entry in ignore_missing(std::fs::read_dir(dir))?
        .into_iter()
        .flatten()
    {
        let entry = entry?;
        let Some(metadata) = ignore_missing(entry.metadata())? else {
            continue;
        };
        size += if metadata.is_dir() {
            directory_size(&entry.path())?
        } else {
            metadata.len()
        };
    }
    Ok(size)
}

/// Removes a file, or a directory with everything in it. Does nothing when the path does not exist.
pub fn remove_path(path: &Path) -> std::io::Result<()> {
    let removal = if path.is_dir() {
        std::fs::remove_dir_all(path)
    } else {
        std::fs::remove_file(path)
    };
    ignore_missing(removal).map(|_| ())
}

fn ignore_missing<T>(result: std::io::Result<T>) -> std::io::Result<Option<T>> {
    match result {
        Ok(value) => Ok(Some(value)),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adds_up_the_files_in_subdirectories() {
        let dir = tempfile::tempdir().expect("temp dir");
        std::fs::create_dir(dir.path().join("run-0")).expect("create run dir");
        std::fs::write(dir.path().join("seg-0.m4s"), [0; 10]).expect("write segment");
        std::fs::write(dir.path().join("run-0/s00000.m4s"), [0; 5]).expect("write output");
        assert_eq!(directory_size(dir.path()).ok(), Some(15));
    }

    #[test]
    fn measures_a_missing_directory_as_empty() {
        let dir = tempfile::tempdir().expect("temp dir");
        assert_eq!(directory_size(&dir.path().join("missing")).ok(), Some(0));
    }

    #[test]
    fn removes_a_directory_with_its_files() {
        let dir = tempfile::tempdir().expect("temp dir");
        let entry = dir.path().join("entry");
        std::fs::create_dir(&entry).expect("create entry");
        std::fs::write(entry.join("seg-0.m4s"), [0; 10]).expect("write segment");
        remove_path(&entry).expect("remove");
        assert!(!entry.exists());
    }

    #[test]
    fn removes_nothing_when_the_path_is_missing() {
        let dir = tempfile::tempdir().expect("temp dir");
        assert!(remove_path(&dir.path().join("missing")).is_ok());
    }

    #[test]
    fn reports_a_disk_with_some_capacity() {
        let dir = tempfile::tempdir().expect("temp dir");
        assert!(disk_space(dir.path()).is_ok_and(|disk| disk.capacity > 0));
    }
}
