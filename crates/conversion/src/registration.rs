//! Gathering what a new cache entry's manifest records about its source and segments.

use std::path::Path;
use std::time::UNIX_EPOCH;

use easyimmerse_media::playback::ConversionPlan;
use easyimmerse_media::{ContainerInfo, SegmentPlan, TrackInfo};
use easyimmerse_media_ffmpeg::{FfmpegPaths, audio_timeline, keyframe_index};

use crate::error::ConversionError;
use crate::key::SourceIdentity;
use crate::manifest::{Manifest, now_ms};

/// Reads the source file's size and modification time.
pub async fn read_source_identity(path: &Path) -> Result<SourceIdentity<'_>, ConversionError> {
    let metadata = tokio::fs::metadata(path).await?;
    let modified = metadata
        .modified()?
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    Ok(SourceIdentity {
        path,
        size: metadata.len(),
        modified_ms: u64::try_from(modified.as_millis()).unwrap_or(u64::MAX),
    })
}

/// Plans the segments of a new conversion and describes it in a manifest.
pub async fn create_manifest(
    source: &SourceIdentity<'_>,
    container: &ContainerInfo,
    plan: &ConversionPlan,
    ffmpeg_paths: &FfmpegPaths,
) -> Result<Manifest, ConversionError> {
    let video_track = video_track(container, plan)?;
    let segment_plan = plan_segments(source.path, video_track.is_some(), ffmpeg_paths).await?;
    let now = now_ms();
    Ok(Manifest {
        source_path: source.path.to_owned(),
        source_size: source.size,
        source_modified_ms: source.modified_ms,
        plan: plan.clone(),
        video_track,
        segment_plan,
        created_ms: now,
        last_access_ms: now,
    })
}

fn video_track(
    container: &ContainerInfo,
    plan: &ConversionPlan,
) -> Result<Option<TrackInfo>, ConversionError> {
    let Some(video) = &plan.video else {
        return Ok(None);
    };
    let track = container
        .tracks
        .iter()
        .find(|track| track.id == video.track_id);
    track
        .cloned()
        .map(Some)
        .ok_or(ConversionError::MissingVideoTrack(video.track_id))
}

/// Plans one segment per keyframe interval with video, or fixed-length segments for audio alone.
async fn plan_segments(
    source_path: &Path,
    has_video: bool,
    ffmpeg_paths: &FfmpegPaths,
) -> Result<SegmentPlan, ConversionError> {
    let (path, paths) = (source_path.to_owned(), ffmpeg_paths.clone());
    let plan = tokio::task::spawn_blocking(move || {
        if has_video {
            keyframe_index(&path, &paths).map(|index| SegmentPlan::from_keyframes(&index))
        } else {
            audio_timeline(&path, &paths).map(SegmentPlan::fixed_length)
        }
    });
    Ok(plan.await??)
}
