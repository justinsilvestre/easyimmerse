//! Container metadata read through ffprobe, for files the pure-Rust probe cannot read.

use std::path::Path;
use std::process::Command;

use easyimmerse_media::{ContainerFormat, ContainerInfo, TrackInfo, TrackKind, parse_language_tag};

use crate::error::FfmpegError;
use crate::ffprobe_output::{FfprobeOutput, FfprobeStream, parse_ffprobe_output};
use crate::locate::{BinaryName, FfmpegPaths, locate_binary};

pub fn probe_file(path: &Path, paths: &FfmpegPaths) -> Result<ContainerInfo, FfmpegError> {
    let ffprobe = locate_binary(BinaryName::Ffprobe, paths)?;
    let json = run_ffprobe(&ffprobe, path)?;
    to_container_info(&parse_ffprobe_output(&json)?)
}

fn run_ffprobe(ffprobe: &Path, path: &Path) -> Result<String, FfmpegError> {
    let output = Command::new(ffprobe)
        .args([
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
        ])
        .arg(path)
        .output()
        .map_err(|source| FfmpegError::Spawn {
            binary: BinaryName::Ffprobe,
            source,
        })?;
    if !output.status.success() {
        return Err(FfmpegError::Failed {
            binary: BinaryName::Ffprobe,
            status: output.status,
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        });
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

fn to_container_info(output: &FfprobeOutput) -> Result<ContainerInfo, FfmpegError> {
    Ok(ContainerInfo {
        format: to_container_format(&output.format.format_name)?,
        duration_ms: output
            .format
            .duration
            .as_deref()
            .and_then(parse_duration_ms),
        tracks: output.streams.iter().map(to_track_info).collect(),
    })
}

/// ffprobe names every demuxer that handles the file, so the list is matched by
/// substring: `mov,mp4,m4a,3gp,3g2,mj2` for MP4 and `matroska,webm` for Matroska.
fn to_container_format(format_name: &str) -> Result<ContainerFormat, FfmpegError> {
    let names: Vec<&str> = format_name.split(',').collect();
    if names.contains(&"mp4") {
        Ok(ContainerFormat::Mp4)
    } else if names.contains(&"matroska") {
        Ok(ContainerFormat::Matroska)
    } else if names.contains(&"mp3") {
        Ok(ContainerFormat::Mp3)
    } else {
        Err(FfmpegError::UnsupportedFormat(format_name.to_owned()))
    }
}

fn parse_duration_ms(seconds: &str) -> Option<u64> {
    let seconds: f64 = seconds.parse().ok()?;
    (seconds >= 0.0).then(|| (seconds * 1000.0).round() as u64)
}

fn to_track_info(stream: &FfprobeStream) -> TrackInfo {
    TrackInfo {
        id: stream.index,
        kind: to_track_kind(&stream.codec_type),
        codec: stream
            .codec_name
            .clone()
            .unwrap_or_else(|| "unknown".to_owned()),
        language: stream.tags.language.as_deref().and_then(parse_language_tag),
    }
}

fn to_track_kind(codec_type: &str) -> TrackKind {
    match codec_type {
        "video" => TrackKind::Video,
        "audio" => TrackKind::Audio,
        "subtitle" => TrackKind::Subtitle,
        _ => TrackKind::Other,
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::*;

    fn sample_info() -> ContainerInfo {
        let json = include_str!("../tests/data/ffprobe-sample.json");
        to_container_info(&parse_ffprobe_output(json).expect("parse")).expect("convert")
    }

    fn fixture_path(name: &str) -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../fixtures")
            .join(name)
    }

    #[test]
    fn recognizes_the_mp4_demuxer_list() {
        assert_eq!(sample_info().format, ContainerFormat::Mp4);
    }

    #[test]
    fn recognizes_the_matroska_demuxer_list() {
        assert_eq!(
            to_container_format("matroska,webm").ok(),
            Some(ContainerFormat::Matroska)
        );
    }

    #[test]
    fn rejects_an_unknown_demuxer_list() {
        assert!(matches!(
            to_container_format("ogg"),
            Err(FfmpegError::UnsupportedFormat(_))
        ));
    }

    #[test]
    fn converts_the_duration_to_milliseconds() {
        assert_eq!(sample_info().duration_ms, Some(5000));
    }

    #[test]
    fn maps_the_stream_kinds() {
        let kinds: Vec<TrackKind> = sample_info().tracks.iter().map(|t| t.kind).collect();
        assert_eq!(
            kinds,
            [TrackKind::Video, TrackKind::Audio, TrackKind::Subtitle]
        );
    }

    #[test]
    fn keeps_the_subtitle_language_and_drops_undetermined_ones() {
        let languages: Vec<Option<String>> = sample_info()
            .tracks
            .into_iter()
            .map(|t| t.language)
            .collect();
        assert_eq!(languages, [None, None, Some("eng".to_owned())]);
    }

    #[test]
    fn probes_the_mp4_fixture_with_ffprobe() {
        if locate_binary(BinaryName::Ffprobe, &FfmpegPaths::default()).is_err() {
            eprintln!("skipped: ffprobe not found");
            return;
        }
        let info = probe_file(&fixture_path("sample.mp4"), &FfmpegPaths::default()).expect("probe");
        assert_eq!(info.tracks.len(), 3);
    }
}
