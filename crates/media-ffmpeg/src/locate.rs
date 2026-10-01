//! Finding the ffmpeg and ffprobe binaries on the local machine.

use std::env::consts::EXE_SUFFIX;
use std::ffi::OsString;
use std::fmt;
use std::path::{Path, PathBuf};

use crate::error::FfmpegError;

/// The environment variable naming a directory that holds both binaries.
pub const FFMPEG_DIR_VAR: &str = "EASYIMMERSE_FFMPEG_DIR";

/// The target triple this crate was compiled for, used in Tauri sidecar file names.
const TARGET_TRIPLE: &str = env!("TARGET");

/// Explicit binary locations, for example from user settings. Either may be absent.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct FfmpegPaths {
    pub ffmpeg: Option<PathBuf>,
    pub ffprobe: Option<PathBuf>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BinaryName {
    Ffmpeg,
    Ffprobe,
}

impl BinaryName {
    pub fn as_str(self) -> &'static str {
        match self {
            BinaryName::Ffmpeg => "ffmpeg",
            BinaryName::Ffprobe => "ffprobe",
        }
    }
}

impl fmt::Display for BinaryName {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

/// Returns the first existing file among, in order: the explicit override, the
/// `EASYIMMERSE_FFMPEG_DIR` directory, the current executable's directory (as a plain
/// name or a Tauri sidecar name with the target triple), and the `PATH` entries.
pub fn locate_binary(name: BinaryName, overrides: &FfmpegPaths) -> Result<PathBuf, FfmpegError> {
    locate_binary_in(name, overrides, &SearchEnvironment::from_process())
}

/// The process-level inputs to the search, separated out so tests can supply them.
pub(crate) struct SearchEnvironment {
    pub ffmpeg_dir: Option<PathBuf>,
    pub executable_dir: Option<PathBuf>,
    pub path: Option<OsString>,
}

impl SearchEnvironment {
    fn from_process() -> Self {
        Self {
            ffmpeg_dir: std::env::var_os(FFMPEG_DIR_VAR).map(PathBuf::from),
            executable_dir: std::env::current_exe()
                .ok()
                .and_then(|exe| exe.parent().map(Path::to_path_buf)),
            path: std::env::var_os("PATH"),
        }
    }
}

pub(crate) fn locate_binary_in(
    name: BinaryName,
    overrides: &FfmpegPaths,
    environment: &SearchEnvironment,
) -> Result<PathBuf, FfmpegError> {
    candidate_paths(name, overrides, environment)
        .into_iter()
        .find(|candidate| candidate.is_file())
        .ok_or(FfmpegError::BinaryNotFound(name))
}

fn candidate_paths(
    name: BinaryName,
    overrides: &FfmpegPaths,
    environment: &SearchEnvironment,
) -> Vec<PathBuf> {
    let file_name = format!("{name}{EXE_SUFFIX}");
    let sidecar_name = format!("{name}-{TARGET_TRIPLE}{EXE_SUFFIX}");
    let mut candidates = Vec::new();
    candidates.extend(override_for(name, overrides).cloned());
    candidates.extend(
        environment
            .ffmpeg_dir
            .iter()
            .map(|dir| dir.join(&file_name)),
    );
    candidates.extend(
        environment
            .executable_dir
            .iter()
            .map(|dir| dir.join(&file_name)),
    );
    candidates.extend(
        environment
            .executable_dir
            .iter()
            .map(|dir| dir.join(&sidecar_name)),
    );
    candidates.extend(path_entries(environment).map(|dir| dir.join(&file_name)));
    candidates
}

fn override_for(name: BinaryName, overrides: &FfmpegPaths) -> Option<&PathBuf> {
    match name {
        BinaryName::Ffmpeg => overrides.ffmpeg.as_ref(),
        BinaryName::Ffprobe => overrides.ffprobe.as_ref(),
    }
}

fn path_entries(environment: &SearchEnvironment) -> impl Iterator<Item = PathBuf> + '_ {
    environment
        .path
        .iter()
        .flat_map(|path| std::env::split_paths(path).collect::<Vec<_>>())
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::TempDir;

    use super::*;

    fn create_file(dir: &Path, name: &str) -> PathBuf {
        let path = dir.join(name);
        fs::write(&path, b"").expect("write");
        path
    }

    fn empty_environment() -> SearchEnvironment {
        SearchEnvironment {
            ffmpeg_dir: None,
            executable_dir: None,
            path: None,
        }
    }

    fn file_name(name: BinaryName) -> String {
        format!("{name}{EXE_SUFFIX}")
    }

    #[test]
    fn prefers_the_explicit_override() {
        let dir = TempDir::new().expect("temp dir");
        let override_path = create_file(dir.path(), "custom-ffmpeg");
        create_file(dir.path(), &file_name(BinaryName::Ffmpeg));
        let overrides = FfmpegPaths {
            ffmpeg: Some(override_path.clone()),
            ffprobe: None,
        };
        let environment = SearchEnvironment {
            ffmpeg_dir: Some(dir.path().to_path_buf()),
            ..empty_environment()
        };
        let found = locate_binary_in(BinaryName::Ffmpeg, &overrides, &environment);
        assert_eq!(found.ok(), Some(override_path));
    }

    #[test]
    fn finds_the_binary_in_the_configured_directory() {
        let dir = TempDir::new().expect("temp dir");
        let expected = create_file(dir.path(), &file_name(BinaryName::Ffprobe));
        let environment = SearchEnvironment {
            ffmpeg_dir: Some(dir.path().to_path_buf()),
            ..empty_environment()
        };
        let found = locate_binary_in(BinaryName::Ffprobe, &FfmpegPaths::default(), &environment);
        assert_eq!(found.ok(), Some(expected));
    }

    #[test]
    fn finds_the_binary_next_to_the_executable() {
        let dir = TempDir::new().expect("temp dir");
        let expected = create_file(dir.path(), &file_name(BinaryName::Ffmpeg));
        let environment = SearchEnvironment {
            executable_dir: Some(dir.path().to_path_buf()),
            ..empty_environment()
        };
        let found = locate_binary_in(BinaryName::Ffmpeg, &FfmpegPaths::default(), &environment);
        assert_eq!(found.ok(), Some(expected));
    }

    #[test]
    fn finds_the_sidecar_named_with_the_target_triple() {
        let dir = TempDir::new().expect("temp dir");
        let expected = create_file(dir.path(), &format!("ffprobe-{TARGET_TRIPLE}{EXE_SUFFIX}"));
        let environment = SearchEnvironment {
            executable_dir: Some(dir.path().to_path_buf()),
            ..empty_environment()
        };
        let found = locate_binary_in(BinaryName::Ffprobe, &FfmpegPaths::default(), &environment);
        assert_eq!(found.ok(), Some(expected));
    }

    #[test]
    fn falls_back_to_the_path_entries() {
        let first = TempDir::new().expect("temp dir");
        let second = TempDir::new().expect("temp dir");
        let expected = create_file(second.path(), &file_name(BinaryName::Ffmpeg));
        let environment = SearchEnvironment {
            path: std::env::join_paths([first.path(), second.path()]).ok(),
            ..empty_environment()
        };
        let found = locate_binary_in(BinaryName::Ffmpeg, &FfmpegPaths::default(), &environment);
        assert_eq!(found.ok(), Some(expected));
    }

    #[test]
    fn skips_a_directory_entry_with_the_binary_name() {
        let dir = TempDir::new().expect("temp dir");
        fs::create_dir(dir.path().join(file_name(BinaryName::Ffmpeg))).expect("mkdir");
        let environment = SearchEnvironment {
            ffmpeg_dir: Some(dir.path().to_path_buf()),
            ..empty_environment()
        };
        let found = locate_binary_in(BinaryName::Ffmpeg, &FfmpegPaths::default(), &environment);
        assert!(matches!(
            found,
            Err(FfmpegError::BinaryNotFound(BinaryName::Ffmpeg))
        ));
    }

    #[test]
    fn reports_when_nothing_matches() {
        let found = locate_binary_in(
            BinaryName::Ffprobe,
            &FfmpegPaths::default(),
            &empty_environment(),
        );
        assert!(matches!(
            found,
            Err(FfmpegError::BinaryNotFound(BinaryName::Ffprobe))
        ));
    }
}
