//! Reading the source file's video packets with ffprobe and decoding video frames with ffmpeg.

use std::path::Path;
use std::process::Command;

use easyimmerse_media_ffmpeg::BinaryName;
use sha2::{Digest, Sha256};

use super::find_binary;
use super::fmp4_samples::Sample;
use super::units_to_microseconds;

/// The bytes of one decoded frame of the fixture: 128x72 luma followed by two 64x36 chroma planes.
pub const FRAME_WIDTH: usize = 128;
pub const FRAME_BYTES: usize = FRAME_WIDTH * 72 * 3 / 2;

/// A compressed video frame as a player receives it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VideoPacket {
    pub presentation_us: i64,
    pub is_keyframe: bool,
    /// The SHA-256 digest of the packet's data, in lowercase hexadecimal.
    pub data_sha256: String,
}

impl VideoPacket {
    pub fn from_sample(sample: &Sample, timescale: u32) -> Self {
        VideoPacket {
            presentation_us: units_to_microseconds(sample.presentation_time, timescale),
            is_keyframe: sample.is_sync,
            data_sha256: hex::encode(Sha256::digest(&sample.data)),
        }
    }
}

/// Returns the video packets of a source file in decode order.
pub fn read_source_video_packets(path: &Path) -> Vec<VideoPacket> {
    let ffprobe = find_binary(BinaryName::Ffprobe).expect("ffprobe");
    let output = run(Command::new(ffprobe)
        .args([
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_data_hash",
            "SHA256",
            "-show_entries",
            "packet=pts_time,flags,data_hash",
            "-of",
            "csv=p=0",
        ])
        .arg(path));
    String::from_utf8(output)
        .expect("utf-8")
        .lines()
        .map(parse_packet_line)
        .collect()
}

/// Decodes every video frame of a file in presentation order, without dropping or repeating any.
pub fn decode_video_frames(path: &Path) -> Vec<Vec<u8>> {
    let ffmpeg = find_binary(BinaryName::Ffmpeg).expect("ffmpeg");
    let output = run(Command::new(ffmpeg)
        .args(["-nostdin", "-v", "error", "-i"])
        .arg(path)
        .args(["-map", "0:v:0", "-fps_mode", "passthrough"])
        .args(["-f", "rawvideo", "-pix_fmt", "yuv420p", "-"]));
    assert_eq!(output.len() % FRAME_BYTES, 0, "whole frames");
    output.chunks(FRAME_BYTES).map(<[u8]>::to_vec).collect()
}

/// Reads a line like `0.125000,___,SHA256:d101…`.
fn parse_packet_line(line: &str) -> VideoPacket {
    let mut fields = line.split(',');
    let seconds = fields.next().expect("pts_time");
    let flags = fields.next().expect("flags");
    let hash = fields.next().expect("data_hash");
    VideoPacket {
        presentation_us: parse_microseconds(seconds),
        is_keyframe: flags.starts_with('K'),
        data_sha256: hash.trim_start_matches("SHA256:").to_owned(),
    }
}

/// Parses ffprobe's six-decimal seconds exactly.
fn parse_microseconds(seconds: &str) -> i64 {
    let (whole, fraction) = seconds.split_once('.').expect("decimal seconds");
    assert_eq!(fraction.len(), 6, "six decimals");
    let sign = if whole.starts_with('-') { -1 } else { 1 };
    let whole: i64 = whole.parse().expect("seconds");
    let fraction: i64 = fraction.parse().expect("microseconds");
    whole * 1_000_000 + sign * fraction
}

fn run(command: &mut Command) -> Vec<u8> {
    let output = command.output().expect("the binary runs");
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    output.stdout
}
