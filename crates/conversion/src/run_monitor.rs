//! Moves the segments a run has finished into the cache entry, identified by their decode time.

use std::path::{Path, PathBuf};
use std::process::ExitStatus;
use std::sync::{Arc, Mutex};

use easyimmerse_media::{SegmentPlan, read_first_decode_times, read_init_timescales};
use easyimmerse_media_ffmpeg::OUTPUT_TS_OFFSET_SECONDS;

use crate::entry::ConversionEntry;
use crate::run_policy::{RunProgress, should_stop};
use crate::segment_files::{INIT_SEGMENT_FILE_NAME, is_finished_segment_file};

/// Places every finished segment in the run directory that has not been placed yet.
/// Returns true once the run has written far enough ahead and should be stopped.
pub async fn collect_output(
    entry: &Arc<ConversionEntry>,
    run_dir: &Path,
    progress: &Arc<Mutex<RunProgress>>,
) -> bool {
    let entry = Arc::clone(entry);
    let run_dir = run_dir.to_path_buf();
    let progress = Arc::clone(progress);
    tokio::task::spawn_blocking(move || collect_output_blocking(&entry, &run_dir, &progress))
        .await
        .unwrap_or(false)
}

fn collect_output_blocking(
    entry: &ConversionEntry,
    run_dir: &Path,
    progress: &Mutex<RunProgress>,
) -> bool {
    let Ok(timescales) = read_run_timescales(run_dir) else {
        return false;
    };
    let mut placed_any = false;
    for file in finished_segment_files(run_dir) {
        if let Err(error) = place_segment(entry, &file, &timescales, progress) {
            tracing::warn!("could not place {}: {error}", file.display());
        }
        placed_any = true;
    }
    if placed_any {
        entry.notify_produced();
    }
    progress
        .lock()
        .map(|progress| should_stop(&entry.manifest.segment_plan, &progress))
        .unwrap_or(false)
}

fn read_run_timescales(run_dir: &Path) -> Result<Vec<(u32, u32)>, ()> {
    let init = std::fs::read(run_dir.join(INIT_SEGMENT_FILE_NAME)).map_err(|_| ())?;
    let timescales = read_init_timescales(&init).map_err(|_| ())?;
    Ok(timescales
        .into_iter()
        .map(|track| (track.track_id, track.timescale))
        .collect())
}

/// The segment files ffmpeg has renamed from their temporary names, in name order.
fn finished_segment_files(run_dir: &Path) -> Vec<PathBuf> {
    let Ok(entries) = std::fs::read_dir(run_dir) else {
        return Vec::new();
    };
    let mut files: Vec<PathBuf> = entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(is_finished_segment_file)
        })
        .collect();
    files.sort();
    files
}

/// Identifies the segment by the first track fragment's decode time, keeps it unless the run
/// discards it or the cache already has it, and copies the init segment alongside the first one.
fn place_segment(
    entry: &ConversionEntry,
    file: &Path,
    timescales: &[(u32, u32)],
    progress: &Mutex<RunProgress>,
) -> std::io::Result<()> {
    let bytes = std::fs::read(file)?;
    let Some(index) = segment_index(&entry.manifest.segment_plan, &bytes, timescales) else {
        tracing::warn!("{} has no readable decode time", file.display());
        return std::fs::remove_file(file);
    };
    let discarded = progress
        .lock()
        .map(|progress| progress.discards(index))
        .unwrap_or(true);
    let destination = entry.segment_path(index);
    if discarded || destination.exists() {
        return std::fs::remove_file(file);
    }
    ensure_init_segment(entry)?;
    std::fs::rename(file, &destination)?;
    if let Ok(mut progress) = progress.lock() {
        progress.latest_index = Some(
            progress
                .latest_index
                .map_or(index, |latest| latest.max(index)),
        );
    }
    Ok(())
}

/// Maps the first fragment's `tfdt`, less the run command's output timestamp offset, onto
/// the plan. The first fragment belongs to the video track when there is one.
pub(crate) fn segment_index(
    plan: &SegmentPlan,
    segment: &[u8],
    timescales: &[(u32, u32)],
) -> Option<usize> {
    let first = read_first_decode_times(segment).ok()?.into_iter().next()?;
    let timescale = timescales
        .iter()
        .find(|(track_id, _)| *track_id == first.track_id)
        .map(|(_, timescale)| *timescale)?;
    let offset_ticks = i64::from(OUTPUT_TS_OFFSET_SECONDS) * i64::from(timescale);
    let decode_ticks = i64::try_from(first.decode_time).ok()? - offset_ticks;
    plan.index_for_decode_time(decode_ticks, timescale)
}

fn ensure_init_segment(entry: &ConversionEntry) -> std::io::Result<()> {
    let destination = entry.init_segment_path();
    if destination.exists() {
        return Ok(());
    }
    let run_init =
        crate::cache_layout::CacheLayout::run_dir(&entry.dir).join(INIT_SEGMENT_FILE_NAME);
    std::fs::copy(run_init, destination).map(|_| ())
}

/// Records a failed exit in the entry's diagnostics; a kill is the normal way a run ends.
pub fn remember_failure(
    entry: &ConversionEntry,
    status: std::io::Result<ExitStatus>,
    progress: &Mutex<RunProgress>,
) {
    let placed_nothing = progress
        .lock()
        .map(|progress| progress.latest_index.is_none())
        .unwrap_or(false);
    match status {
        Ok(status) if status.success() => {}
        Ok(status) if status.code().is_none() => {}
        Ok(status) => {
            tracing::warn!(
                "ffmpeg exited with {status} converting {} (placed nothing: {placed_nothing})",
                entry.key
            );
            ConversionEntry::append_stderr(&entry.stderr, &format!("[exited with {status}]\n"));
            mark_failed(progress);
        }
        Err(error) => {
            ConversionEntry::append_stderr(&entry.stderr, &format!("[wait failed: {error}]\n"));
            mark_failed(progress);
        }
    }
}

fn mark_failed(progress: &Mutex<RunProgress>) {
    if let Ok(mut progress) = progress.lock() {
        progress.failed = true;
    }
}
