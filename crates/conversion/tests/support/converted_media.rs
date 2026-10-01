//! Converting the fixture through the conversion service and reading back the cached init and media segments.

use std::path::Path;

use easyimmerse_conversion::ConversionService;
use easyimmerse_media::playback::{AudioTarget, ConversionPlan, TrackAction, TrackConversion};
use easyimmerse_media::{ContainerInfo, TrackKind};
use easyimmerse_media_ffmpeg::{BinaryName, FfmpegPaths, probe_file};
use tempfile::TempDir;

use super::fmp4_samples::{Sample, read_samples, read_timescales};
use super::{FIXTURE_NAME, find_binary, fixture_path};

/// The fMP4 track ids that ffmpeg gives the video and audio tracks, numbered in mapping order.
pub const VIDEO_TRACK_ID: u32 = 1;
pub const AUDIO_TRACK_ID: u32 = 2;

/// The number of planned segments of the fixture: one per keyframe.
pub const SEGMENT_COUNT: u32 = 11;

/// The cached output of one conversion of the fixture.
pub struct ConvertedMedia {
    pub init: Vec<u8>,
    /// The media segments in planned order.
    pub segments: Vec<Vec<u8>>,
    /// The cache directory, which is removed when this value is dropped.
    pub cache: TempDir,
}

impl ConvertedMedia {
    pub fn timescale(&self, track_id: u32) -> u32 {
        let timescales = read_timescales(&self.init);
        let (_, timescale) = timescales
            .into_iter()
            .find(|(id, _)| *id == track_id)
            .expect("the init segment describes the track");
        timescale
    }

    /// Returns the samples of one track in each segment, in planned order.
    pub fn samples_by_segment(&self, track_id: u32) -> Vec<Vec<Sample>> {
        let of_track = |segment: &Vec<u8>| {
            let samples = read_samples(segment).into_iter();
            samples
                .filter(|sample| sample.track_id == track_id)
                .collect()
        };
        self.segments.iter().map(of_track).collect()
    }

    /// Writes the init segment followed by every media segment into one file, which ffmpeg reads as a fragmented MP4.
    pub fn write_joined(&self, path: &Path) {
        let joined = [vec![self.init.clone()], self.segments.clone()].concat();
        std::fs::write(path, joined.concat()).expect("write the joined segments");
    }
}

/// Converts the fixture, requesting its segments in the given order, which decides where ffmpeg starts and restarts.
/// Returns `None` when ffmpeg is not available.
pub async fn convert_fixture(request_order: &[u32]) -> Option<ConvertedMedia> {
    find_binary(BinaryName::Ffmpeg)?;
    find_binary(BinaryName::Ffprobe)?;
    let cache = TempDir::new().expect("temp dir");
    let paths = FfmpegPaths::default();
    let service = ConversionService::new(cache.path().to_owned(), paths.clone()).expect("ffmpeg");
    let source = fixture_path(FIXTURE_NAME);
    let container = probe_file(&source, &paths).expect("the fixture probes");
    let key = service
        .register(&source, &container, &plan(&container))
        .await
        .expect("registers");
    for &index in request_order {
        service.segment(&key, index).await.expect("segment");
    }
    let init = std::fs::read(service.init_segment(&key).await.expect("init")).expect("read init");
    let mut segments = Vec::new();
    for index in 0..SEGMENT_COUNT {
        let path = service.segment(&key, index).await.expect("cached segment");
        segments.push(std::fs::read(path).expect("read segment"));
    }
    service.shutdown().await;
    Some(ConvertedMedia {
        init,
        segments,
        cache,
    })
}

/// Copies the video and transcodes the audio to AAC, as the playback plan does for MP3 audio.
fn plan(container: &ContainerInfo) -> ConversionPlan {
    let aac = TrackAction::Transcode {
        target: AudioTarget::Aac,
    };
    ConversionPlan {
        video: track_conversion(container, TrackKind::Video, TrackAction::Copy),
        audio: track_conversion(container, TrackKind::Audio, aac),
    }
}

fn track_conversion(
    container: &ContainerInfo,
    kind: TrackKind,
    action: TrackAction,
) -> Option<TrackConversion> {
    let track = container.tracks.iter().find(|track| track.kind == kind)?;
    Some(TrackConversion {
        track_id: track.id,
        action,
        reasons: Vec::new(),
    })
}
