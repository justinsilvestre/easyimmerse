//! Reading the tracks of a media file on the server.

use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};

use easyimmerse_media::{ContainerInfo, probe_container_reader};
use easyimmerse_media_ffmpeg::{FfmpegError, FfmpegPaths, probe_file};

use crate::auth::error_body::{ApiFailure, bad_request, internal, not_found};

/// Reads the container and tracks of the file at `path`.
/// Uses ffprobe when it can be found, since it reads more formats, and the built-in parsers otherwise.
pub async fn probe_media(path: &str) -> Result<ContainerInfo, ApiFailure> {
    let path = PathBuf::from(path);
    tokio::task::spawn_blocking(move || probe_path(&path))
        .await
        .map_err(|error| internal(format!("media task failed: {error}")))?
}

fn probe_path(path: &Path) -> Result<ContainerInfo, ApiFailure> {
    if !path.is_file() {
        return Err(not_found(format!("no file at {path:?}")));
    }
    match probe_file(path, &FfmpegPaths::default()) {
        Err(FfmpegError::BinaryNotFound(_)) => probe_with_built_in_parsers(path),
        probed => probed.map_err(|error| bad_request(error.to_string())),
    }
}

fn probe_with_built_in_parsers(path: &Path) -> Result<ContainerInfo, ApiFailure> {
    let read_error = |error| bad_request(format!("could not read {path:?}: {error}"));
    let file = File::open(path).map_err(read_error)?;
    let size = file.metadata().map_err(read_error)?.len();
    Ok(probe_container_reader(BufReader::new(file), size)?)
}

#[cfg(test)]
mod tests {
    use easyimmerse_media::ContainerFormat;

    use super::*;

    fn probe_fixture(name: &str) -> ContainerFormat {
        let path = PathBuf::from(format!(
            "{}/../../fixtures/{name}",
            env!("CARGO_MANIFEST_DIR")
        ));
        probe_with_built_in_parsers(&path)
            .expect("the fixture should parse")
            .format
    }

    #[test]
    fn reads_an_mp4_file_with_the_built_in_parsers() {
        assert_eq!(probe_fixture("sample.mp4"), ContainerFormat::Mp4);
    }

    #[test]
    fn reads_a_matroska_file_with_the_built_in_parsers() {
        assert_eq!(probe_fixture("sample.mkv"), ContainerFormat::Matroska);
    }
}
