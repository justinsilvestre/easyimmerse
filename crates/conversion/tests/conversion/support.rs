#![allow(dead_code)]

use std::path::{Path, PathBuf};
use std::process::Command;

use easyimmerse_conversion::{ConversionKey, ConversionService, ProbeCache};
use easyimmerse_media::{
    AudioAction, AudioTarget, ContainerInfo, ConversionPlan, ConversionReason, PictureSize,
    TrackSelection, VideoAction,
};
use easyimmerse_media_ffmpeg::{BinaryName, FfmpegPaths, find_working_h264_encoder, locate_binary};
use tempfile::TempDir;

pub const MKV: &str = "conversion-h264-aac.mkv";
pub const MPEG4_VORBIS: &str = "conversion-mpeg4-vorbis.mkv";
pub const HEVC: &str = "conversion-hevc-aac.mp4";
pub const TONE_MP3: &str = "conversion-tone.mp3";
pub const TONE_WAV: &str = "conversion-tone.wav";

pub fn fixture_path(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures")
        .join(name)
}

/// True when both binaries can be found. Tests return early with a message otherwise.
pub fn ffmpeg_available() -> bool {
    let paths = FfmpegPaths::default();
    let available = locate_binary(BinaryName::Ffmpeg, &paths).is_ok()
        && locate_binary(BinaryName::Ffprobe, &paths).is_ok();
    if !available {
        eprintln!("skipped: ffmpeg or ffprobe not found");
    }
    available
}

/// The hardware H.264 encoder, or `None` with a message when this machine has none.
pub fn hardware_encoder() -> Option<String> {
    let encoder = find_working_h264_encoder(&FfmpegPaths::default())
        .ok()
        .flatten();
    if encoder.is_none() {
        eprintln!("skipped: no working hardware H.264 encoder");
    }
    encoder
}

pub struct TestService {
    pub service: ConversionService,
    pub cache_dir: TempDir,
}

pub fn open_service() -> TestService {
    let cache_dir = TempDir::new().expect("temp dir");
    let service = ConversionService::open(cache_dir.path().to_path_buf(), FfmpegPaths::default())
        .expect("service");
    TestService { service, cache_dir }
}

pub fn open_service_in(cache_dir: &Path) -> ConversionService {
    ConversionService::open(cache_dir.to_path_buf(), FfmpegPaths::default()).expect("service")
}

pub fn copy_plan() -> ConversionPlan {
    ConversionPlan {
        video: Some(VideoAction::Copy { index: 0 }),
        audio: Some(AudioAction::Copy { index: 1 }),
        reasons: vec![ConversionReason::ContainerUnsupported],
    }
}

pub fn transcode_plan(encoder: &str) -> ConversionPlan {
    ConversionPlan {
        video: Some(VideoAction::Transcode {
            index: 0,
            encoder: encoder.to_owned(),
            scale_to: Some(PictureSize {
                width: 640,
                height: 360,
            }),
            bit_rate: 1_000_000,
            deinterlace: false,
        }),
        audio: Some(AudioAction::Transcode {
            index: 1,
            target: AudioTarget::Aac,
        }),
        reasons: vec![ConversionReason::CodecUnsupported],
    }
}

pub fn audio_only_plan(action: AudioAction) -> ConversionPlan {
    ConversionPlan {
        video: None,
        audio: Some(action),
        reasons: vec![ConversionReason::InaccurateSeeking],
    }
}

pub fn selection_of(plan: &ConversionPlan) -> TrackSelection {
    TrackSelection {
        video: plan.video.as_ref().map(|action| match action {
            VideoAction::Copy { index } | VideoAction::Transcode { index, .. } => *index,
        }),
        audio: plan.audio.as_ref().map(|action| match action {
            AudioAction::Copy { index } | AudioAction::Transcode { index, .. } => *index,
        }),
    }
}

pub async fn register(
    service: &ConversionService,
    fixture: &str,
    plan: ConversionPlan,
) -> (ConversionKey, ContainerInfo) {
    let path = fixture_path(fixture);
    let container = probe(&path).await;
    let key = service
        .register(&path, selection_of(&plan), plan, &container)
        .await
        .expect("register");
    (key, ContainerInfo::clone(&container))
}

pub async fn probe(path: &Path) -> ContainerInfo {
    let probed = ProbeCache::new(FfmpegPaths::default())
        .probe(path)
        .await
        .expect("probe");
    ContainerInfo::clone(&probed)
}

/// Requests the segments in order and returns their paths.
pub async fn fetch_segments(
    service: &ConversionService,
    key: &ConversionKey,
    indexes: impl IntoIterator<Item = usize>,
) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    for index in indexes {
        paths.push(
            service
                .segment(key, index)
                .await
                .unwrap_or_else(|error| panic!("segment {index}: {error}")),
        );
    }
    paths
}

/// Concatenates the init segment and media segments into one file ffmpeg can read.
pub fn concatenate(init: &Path, segments: &[PathBuf], into: &Path) {
    let mut bytes = std::fs::read(init).expect("init");
    for segment in segments {
        bytes.extend(std::fs::read(segment).expect("segment"));
    }
    std::fs::write(into, bytes).expect("write");
}

fn ffmpeg() -> PathBuf {
    locate_binary(BinaryName::Ffmpeg, &FfmpegPaths::default()).expect("ffmpeg")
}

fn ffprobe() -> PathBuf {
    locate_binary(BinaryName::Ffprobe, &FfmpegPaths::default()).expect("ffprobe")
}

fn run(program: &Path, args: &[&str]) -> Vec<u8> {
    let output = Command::new(program).args(args).output().expect("run");
    assert!(
        output.status.success(),
        "{} failed: {}",
        program.display(),
        String::from_utf8_lossy(&output.stderr)
    );
    output.stdout
}

/// Decodes the video of a file in presentation order and reads the frame index drawn into
/// each frame.
pub fn decode_frame_indexes(file: &Path) -> Vec<usize> {
    let file = file.to_str().expect("path");
    let size = String::from_utf8(run(
        &ffprobe(),
        &[
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=p=0",
            file,
        ],
    ))
    .expect("utf8");
    let mut dimensions = size
        .trim()
        .split(',')
        .map(|text| text.parse::<usize>().expect("size"));
    let (width, height) = (
        dimensions.next().expect("width"),
        dimensions.next().expect("height"),
    );
    let pixels = run(
        &ffmpeg(),
        &[
            "-v",
            "error",
            "-i",
            file,
            "-fps_mode",
            "passthrough",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "gray",
            "-",
        ],
    );
    pixels
        .chunks_exact(width * height)
        .map(|frame| decode_frame_index(&frame[..width], width))
        .collect()
}

/// Reads the 16 columns of a conversion fixture frame, least significant bit on the left.
fn decode_frame_index(row: &[u8], width: usize) -> usize {
    (0..16)
        .filter(|bit| row[(bit * 2 + 1) * width / 32] >= 128)
        .fold(0, |index, bit| index | (1 << bit))
}

/// Decodes the audio of a file to mono samples at 48 kHz.
pub fn decode_audio(file: &Path) -> Vec<f32> {
    let bytes = run(
        &ffmpeg(),
        &[
            "-v",
            "error",
            "-i",
            file.to_str().expect("path"),
            "-vn",
            "-ac",
            "1",
            "-ar",
            "48000",
            "-f",
            "f32le",
            "-",
        ],
    );
    bytes
        .chunks_exact(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect()
}

/// The sample positions of the clicks that mark each second in the fixtures' audio: the
/// first sample of each run of samples above the tone's amplitude.
pub fn click_positions(samples: &[f32]) -> Vec<usize> {
    let mut clicks = Vec::new();
    let mut inside = false;
    for (position, sample) in samples.iter().enumerate() {
        let loud = sample.abs() > 0.6;
        if loud && !inside {
            clicks.push(position);
        }
        inside = loud;
    }
    clicks
}

/// The presentation times, in player seconds, of every video sample in the segments, computed
/// the way Media Source Extensions do: the fragment's `tfdt`, the running sum of sample
/// durations, and each sample's composition offset, less the run's output timestamp offset.
pub fn video_presentation_times(init: &Path, segments: &[PathBuf]) -> Vec<f64> {
    let init = std::fs::read(init).expect("init");
    let timescale = easyimmerse_media::read_init_timescales(&init).expect("timescales")[0];
    let mut times = Vec::new();
    for segment in segments {
        let bytes = std::fs::read(segment).expect("segment");
        for moof in boxes(&bytes).filter(|(name, _)| name == b"moof") {
            if let Some(traf) = boxes(moof.1).find(|(name, payload)| {
                name == b"traf" && track_id_of(payload) == Some(timescale.track_id)
            }) {
                times.extend(sample_times(traf.1, timescale.timescale));
            }
        }
    }
    let offset = f64::from(easyimmerse_media_ffmpeg::OUTPUT_TS_OFFSET_SECONDS);
    times.iter().map(|time| time - offset).collect()
}

fn boxes(bytes: &[u8]) -> impl Iterator<Item = (&[u8], &[u8])> {
    let mut offset = 0;
    std::iter::from_fn(move || {
        if offset + 8 > bytes.len() {
            return None;
        }
        let size = u32::from_be_bytes(bytes[offset..offset + 4].try_into().ok()?) as usize;
        let name = &bytes[offset + 4..offset + 8];
        let end = if size == 0 {
            bytes.len()
        } else {
            offset + size
        };
        let payload = &bytes[offset + 8..end.min(bytes.len())];
        offset = end;
        Some((name, payload))
    })
}

fn be_u32(bytes: &[u8], at: usize) -> u32 {
    u32::from_be_bytes(bytes[at..at + 4].try_into().expect("four bytes"))
}

fn track_id_of(traf: &[u8]) -> Option<u32> {
    boxes(traf)
        .find(|(name, _)| name == b"tfhd")
        .map(|(_, tfhd)| be_u32(tfhd, 4))
}

/// Reads the samples of one track fragment from its `tfhd`, `tfdt`, and `trun` boxes.
fn sample_times(traf: &[u8], timescale: u32) -> Vec<f64> {
    let tfhd = boxes(traf)
        .find(|(name, _)| name == b"tfhd")
        .expect("tfhd")
        .1;
    let tfhd_flags = u32::from_be_bytes([0, tfhd[1], tfhd[2], tfhd[3]]);
    let mut at = 8;
    if tfhd_flags & 0x1 != 0 {
        at += 8;
    }
    if tfhd_flags & 0x2 != 0 {
        at += 4;
    }
    let default_duration = (tfhd_flags & 0x8 != 0).then(|| be_u32(tfhd, at));
    let tfdt = boxes(traf)
        .find(|(name, _)| name == b"tfdt")
        .expect("tfdt")
        .1;
    let mut decode = if tfdt[0] == 1 {
        u64::from_be_bytes(tfdt[4..12].try_into().expect("eight bytes")) as i64
    } else {
        i64::from(be_u32(tfdt, 4))
    };
    let trun = boxes(traf)
        .find(|(name, _)| name == b"trun")
        .expect("trun")
        .1;
    let (version, flags) = (trun[0], u32::from_be_bytes([0, trun[1], trun[2], trun[3]]));
    let count = be_u32(trun, 4) as usize;
    let mut at = 8;
    if flags & 0x1 != 0 {
        at += 4;
    }
    if flags & 0x4 != 0 {
        at += 4;
    }
    let mut times = Vec::with_capacity(count);
    for _ in 0..count {
        let mut duration = default_duration.unwrap_or(0);
        if flags & 0x100 != 0 {
            duration = be_u32(trun, at);
            at += 4;
        }
        if flags & 0x200 != 0 {
            at += 4;
        }
        if flags & 0x400 != 0 {
            at += 4;
        }
        let mut composition_offset = 0i64;
        if flags & 0x800 != 0 {
            let raw = be_u32(trun, at);
            composition_offset = if version == 0 {
                i64::from(raw)
            } else {
                i64::from(raw as i32)
            };
            at += 4;
        }
        times.push((decode + composition_offset) as f64 / f64::from(timescale));
        decode += i64::from(duration);
    }
    times
}
