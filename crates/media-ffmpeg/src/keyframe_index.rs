//! Stream timing and keyframe timestamps read through ffprobe.

use std::path::Path;

use easyimmerse_media::{KeyframeIndex, MediaTimeline};
use thiserror::Error;

use crate::error::FfmpegError;
use crate::ffprobe_timeline::parse_timeline;
use crate::locate::{BinaryName, FfmpegPaths, locate_binary};
use crate::run_ffprobe::run_ffprobe;

#[derive(Debug, Error)]
pub enum KeyframeIndexError {
    #[error(transparent)]
    Ffmpeg(#[from] FfmpegError),
    #[error("ffprobe printed timing output that could not be parsed: {0}")]
    InvalidJson(#[from] serde_json::Error),
    #[error("the file has no stream matching {0}")]
    MissingStream(&'static str),
    #[error("ffprobe printed an invalid {field}: {value:?}")]
    InvalidValue { field: &'static str, value: String },
}

/// Reads the timeline and keyframe timestamps of the file's first video stream.
pub fn keyframe_index(
    path: &Path,
    paths: &FfmpegPaths,
) -> Result<KeyframeIndex, KeyframeIndexError> {
    let ffprobe = locate_binary(BinaryName::Ffprobe, paths)?;
    let timeline = read_timeline(&ffprobe, path, "v:0")?;
    let packets = run_ffprobe(
        &ffprobe,
        path,
        &[
            "-select_streams",
            "v:0",
            "-show_entries",
            "packet=pts,flags",
            "-of",
            "csv=p=0",
        ],
    )?;
    let keyframe_pts = parse_keyframe_pts(&packets)?;
    Ok(KeyframeIndex {
        timeline,
        keyframe_pts,
    })
}

/// Reads the timeline of the file's first audio stream, for files without video.
pub fn audio_timeline(
    path: &Path,
    paths: &FfmpegPaths,
) -> Result<MediaTimeline, KeyframeIndexError> {
    let ffprobe = locate_binary(BinaryName::Ffprobe, paths)?;
    read_timeline(&ffprobe, path, "a:0")
}

fn read_timeline(
    ffprobe: &Path,
    path: &Path,
    stream: &'static str,
) -> Result<MediaTimeline, KeyframeIndexError> {
    let entries = "stream=time_base:format=start_time,duration";
    let json = run_ffprobe(
        ffprobe,
        path,
        &[
            "-select_streams",
            stream,
            "-show_entries",
            entries,
            "-of",
            "json",
        ],
    )?;
    parse_timeline(&json, stream)
}

/// Parses ffprobe's `pts,flags` packet lines and returns the keyframe timestamps sorted.
/// Packets arrive in decode order, which differs from presentation order when a stream has B-frames.
fn parse_keyframe_pts(csv: &str) -> Result<Vec<i64>, KeyframeIndexError> {
    let mut keyframe_pts = csv
        .lines()
        .filter_map(keyframe_pts_field)
        .map(parse_pts)
        .collect::<Result<Vec<i64>, _>>()?;
    keyframe_pts.sort_unstable();
    Ok(keyframe_pts)
}

/// Returns the pts field of a packet line whose flags mark a keyframe with `K`.
fn keyframe_pts_field(line: &str) -> Option<&str> {
    let (pts, flags) = line.split_once(',')?;
    flags.contains('K').then_some(pts)
}

fn parse_pts(field: &str) -> Result<i64, KeyframeIndexError> {
    field
        .trim()
        .parse()
        .map_err(|_| KeyframeIndexError::InvalidValue {
            field: "packet pts",
            value: field.to_owned(),
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sorts_keyframes_that_arrive_out_of_order() {
        let csv = "2002,K__\n0,K__\n125,___\n1001,K__\n";
        assert_eq!(parse_keyframe_pts(csv).ok(), Some(vec![0, 1001, 2002]));
    }

    #[test]
    fn ignores_packets_without_the_keyframe_flag() {
        let csv = "0,K__\n42,___\n83,__D\n";
        assert_eq!(parse_keyframe_pts(csv).ok(), Some(vec![0]));
    }

    #[test]
    fn rejects_a_keyframe_without_a_timestamp() {
        assert!(matches!(
            parse_keyframe_pts("N/A,K__\n"),
            Err(KeyframeIndexError::InvalidValue { .. })
        ));
    }
}
