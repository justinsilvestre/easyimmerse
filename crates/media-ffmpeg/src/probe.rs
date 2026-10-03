//! Container metadata read through ffprobe, for files the pure-Rust probe cannot read.

use std::path::Path;

use easyimmerse_media::{ContainerFormat, ContainerInfo};

use crate::error::FfmpegError;
use crate::ffprobe_command::run_ffprobe;
use crate::ffprobe_output::{FfprobeOutput, parse_ffprobe_output};
use crate::ffprobe_time::parse_seconds_to_millis;
use crate::locate::FfmpegPaths;
use crate::probe_track::to_track_info;

pub fn probe_file(path: &Path, paths: &FfmpegPaths) -> Result<ContainerInfo, FfmpegError> {
    let json = run_ffprobe(&["-show_format", "-show_streams"], path, paths)?;
    to_container_info(&parse_ffprobe_output(&json)?)
}

pub(crate) fn to_container_info(output: &FfprobeOutput) -> Result<ContainerInfo, FfmpegError> {
    let format = &output.format;
    Ok(ContainerInfo {
        format: to_container_format(&format.format_name)?,
        duration_ms: format.duration.as_deref().and_then(parse_seconds_to_millis),
        start_ms: format
            .start_time
            .as_deref()
            .and_then(parse_seconds_to_millis),
        bit_rate: format
            .bit_rate
            .as_deref()
            .and_then(|text| text.parse().ok()),
        tracks: output.streams.iter().map(to_track_info).collect(),
    })
}

/// ffprobe names every demuxer that handles the file, so the list is matched by
/// member: `mov,mp4,m4a,3gp,3g2,mj2` for MP4 and `matroska,webm` for Matroska.
fn to_container_format(format_name: &str) -> Result<ContainerFormat, FfmpegError> {
    let names: Vec<&str> = format_name.split(',').collect();
    let known = [
        ("mp4", ContainerFormat::Mp4),
        ("matroska", ContainerFormat::Matroska),
        ("mp3", ContainerFormat::Mp3),
        ("ogg", ContainerFormat::Ogg),
        ("wav", ContainerFormat::Wav),
        ("flac", ContainerFormat::Flac),
        ("aac", ContainerFormat::Adts),
        ("mpegts", ContainerFormat::MpegTs),
        ("avi", ContainerFormat::Avi),
    ];
    known
        .into_iter()
        .find(|(name, _)| names.contains(name))
        .map(|(_, format)| format)
        .ok_or_else(|| FfmpegError::UnsupportedFormat(format_name.to_owned()))
}

#[cfg(test)]
mod tests {
    use easyimmerse_media::TrackKind;

    use super::*;

    fn sample_info() -> ContainerInfo {
        let json = include_str!("../tests/data/ffprobe-sample.json");
        to_container_info(&parse_ffprobe_output(json).expect("parse")).expect("convert")
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
    fn recognizes_every_single_name_format() {
        let formats: Vec<Option<ContainerFormat>> =
            ["mp3", "ogg", "wav", "flac", "aac", "mpegts", "avi"]
                .iter()
                .map(|name| to_container_format(name).ok())
                .collect();
        assert_eq!(
            formats,
            [
                Some(ContainerFormat::Mp3),
                Some(ContainerFormat::Ogg),
                Some(ContainerFormat::Wav),
                Some(ContainerFormat::Flac),
                Some(ContainerFormat::Adts),
                Some(ContainerFormat::MpegTs),
                Some(ContainerFormat::Avi),
            ]
        );
    }

    #[test]
    fn rejects_an_unknown_demuxer_list() {
        assert!(matches!(
            to_container_format("asf"),
            Err(FfmpegError::UnsupportedFormat(_))
        ));
    }

    #[test]
    fn converts_the_duration_to_milliseconds() {
        assert_eq!(sample_info().duration_ms, Some(5000));
    }

    #[test]
    fn reads_the_format_bit_rate_and_start_time() {
        let info = sample_info();
        assert_eq!((info.bit_rate, info.start_ms), (Some(78_115), Some(0)));
    }

    #[test]
    fn maps_the_stream_kinds() {
        let kinds: Vec<TrackKind> = sample_info().tracks.iter().map(|t| t.kind).collect();
        assert_eq!(
            kinds,
            [TrackKind::Video, TrackKind::Audio, TrackKind::Subtitle]
        );
    }
}
