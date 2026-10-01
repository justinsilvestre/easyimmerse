//! Moving the segments that one ffmpeg run completes from its run directory into the cache entry.

use std::collections::BTreeSet;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use easyimmerse_media::{Fmp4Error, SegmentPlan, read_first_decode_times, read_track_timescales};
use easyimmerse_media_ffmpeg::hls_arguments::INIT_SEGMENT_NAME;
use thiserror::Error;

use crate::cache_files::{copy_without_replacing, move_without_replacing};
use crate::entry_paths::EntryPaths;
use crate::produced_segment::{IDENTIFYING_TRACK_ID, is_warm_up, planned_index, produced_number};

/// The name of the temporary copy of the init segment inside a run directory.
const INIT_COPY_NAME: &str = "init.mp4.copy";

#[derive(Debug, Error)]
pub enum CollectError {
    #[error("failed to move a produced segment into the cache: {0}")]
    Io(#[from] std::io::Error),
    #[error("ffmpeg produced a segment that could not be read: {0}")]
    Fmp4(#[from] Fmp4Error),
    #[error("ffmpeg produced a file without the track that identifies its segment")]
    MissingTrack,
    #[error("ffmpeg produced a segment that matches no planned segment")]
    Unplanned,
}

/// The files one run has produced and what has been done with them.
pub struct RunCollector {
    pub run_dir: PathBuf,
    entry: EntryPaths,
    start_index: u32,
    timescale: Option<u32>,
    handled: BTreeSet<u32>,
}

impl RunCollector {
    /// Creates the collector of a run that was asked to start at the planned segment `start_index`.
    pub fn new(entry: EntryPaths, run_dir: PathBuf, start_index: u32) -> Self {
        RunCollector {
            run_dir,
            entry,
            start_index,
            timescale: None,
            handled: BTreeSet::new(),
        }
    }

    /// Moves newly completed segments into the cache, keeping any segment already cached, and returns the highest planned index among them.
    pub async fn collect(&mut self, plan: &SegmentPlan) -> Result<Option<u32>, CollectError> {
        let numbers = self.new_produced_numbers().await?;
        let mut highest = None;
        for number in numbers {
            let timescale = self.init_timescale().await?;
            highest = highest.max(Some(self.collect_one(number, timescale, plan).await?));
        }
        Ok(highest)
    }

    async fn new_produced_numbers(&self) -> Result<BTreeSet<u32>, CollectError> {
        let mut entries = tokio::fs::read_dir(&self.run_dir).await?;
        let mut numbers = BTreeSet::new();
        while let Some(entry) = entries.next_entry().await? {
            let number = entry.file_name().to_str().and_then(produced_number);
            numbers.extend(number.filter(|number| !self.handled.contains(number)));
        }
        Ok(numbers)
    }

    /// Returns the timescale of the track that identifies segments.
    /// The first call reads it from the run's init segment and caches that init segment.
    async fn init_timescale(&mut self) -> Result<u32, CollectError> {
        if let Some(timescale) = self.timescale {
            return Ok(timescale);
        }
        let init_path = self.run_dir.join(INIT_SEGMENT_NAME);
        let timescales = read_track_timescales(&tokio::fs::read(&init_path).await?)?;
        let timescale = *timescales
            .get(&IDENTIFYING_TRACK_ID)
            .ok_or(CollectError::MissingTrack)?;
        self.cache_init_segment(&init_path).await?;
        self.timescale = Some(timescale);
        Ok(timescale)
    }

    /// Caches the run's init segment unless an earlier run's is cached, so the entry keeps the init segment of the first run that completed a segment.
    /// The init segments of all runs describe the same tracks and timescales, so any one serves every run's segments.
    /// They differ in one respect: a run from the beginning of the file adds an audio edit list that hides the encoder priming samples before time zero, and a run that seeks has none. Priming samples are the near-silent samples an AAC encoder emits before the first source sample.
    /// Each run that transcodes audio also starts its own sequence of AAC frames, so where segments from different runs meet, their audio can overlap or leave a gap shorter than one frame (about 21 ms).
    async fn cache_init_segment(&self, init_path: &Path) -> Result<(), std::io::Error> {
        let copy = self.run_dir.join(INIT_COPY_NAME);
        copy_without_replacing(init_path, &copy, &self.entry.init_segment()).await
    }

    async fn collect_one(
        &mut self,
        number: u32,
        timescale: u32,
        plan: &SegmentPlan,
    ) -> Result<u32, CollectError> {
        let path = self.run_dir.join(format!("s{number:05}.m4s"));
        let decode_times = read_first_decode_times(&tokio::fs::read(&path).await?)?;
        let decode_time = *decode_times
            .get(&IDENTIFYING_TRACK_ID)
            .ok_or(CollectError::MissingTrack)?;
        let index = planned_index(plan, decode_time, timescale).ok_or(CollectError::Unplanned)?;
        if is_warm_up(index, self.start_index) {
            tokio::fs::remove_file(&path).await?;
        } else {
            move_without_replacing(&path, &self.entry.segment(index)).await?;
        }
        self.handled.insert(number);
        Ok(index)
    }
}

/// Removes a run directory and any partial files left in it.
pub async fn remove_run_dir(run_dir: &Path) -> Result<(), std::io::Error> {
    match tokio::fs::remove_dir_all(run_dir).await {
        Err(error) if error.kind() != ErrorKind::NotFound => Err(error),
        _ => Ok(()),
    }
}
