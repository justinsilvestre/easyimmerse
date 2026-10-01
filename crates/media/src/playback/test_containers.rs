//! Containers and environments shaped like real files and browsers, for planning tests.

use super::engine::WebEngine;
use super::environment::PlaybackEnvironment;
use crate::container::{ContainerFormat, ContainerInfo};
use crate::track_info::{TrackInfo, TrackKind};

pub const H264: &str = "avc1.64001F";
/// H.264 in the High 10 profile, which WebKit does not play.
pub const H264_HIGH_10: &str = "avc1.6E0028";
/// The codec string of the H.264 video target.
pub const H264_TARGET: &str = "avc1.640033";
pub const HEVC: &str = "hvc1.1.6.L93.B0";
pub const AAC: &str = "mp4a.40.2";
pub const MP3: &str = "mp4a.6B";
pub const FLAC: &str = "fLaC";

/// Codec strings that WebKit accepts in fragmented MP4, without HEVC.
pub const WEBKIT_FMP4_CODECS: &[&str] = &[H264, H264_TARGET, AAC, FLAC];

pub fn track(id: u32, kind: TrackKind, codec_string: &str) -> TrackInfo {
    TrackInfo {
        codec_string: Some(codec_string.to_owned()),
        is_default: true,
        ..TrackInfo::new(id, kind, codec_string.to_owned())
    }
}

pub fn container(format: ContainerFormat, tracks: Vec<TrackInfo>) -> ContainerInfo {
    ContainerInfo {
        format,
        duration_ms: Some(1_560_000),
        tracks,
    }
}

/// A Matroska file with H.264 video and MP3 audio, like the episode of Frieren that motivated conversion.
pub fn frieren_mkv() -> ContainerInfo {
    container(
        ContainerFormat::Matroska,
        vec![
            track(0, TrackKind::Video, H264),
            track(1, TrackKind::Audio, MP3),
        ],
    )
}

pub fn webkit(direct_play: bool, fmp4_codecs: &[&str]) -> PlaybackEnvironment {
    PlaybackEnvironment {
        engine: WebEngine::WebKit,
        direct_play,
        fmp4_codecs: fmp4_codecs.iter().map(|codec| codec.to_string()).collect(),
    }
}
