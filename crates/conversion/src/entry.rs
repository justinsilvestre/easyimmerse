//! One registered conversion: its manifest and playlist, its cache directory, the active run,
//! and what eviction needs to know about recent use.

use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime};

use easyimmerse_media::render_vod_playlist;
use tokio::sync::watch;

use crate::key::ConversionKey;
use crate::manifest::{Manifest, manifest_path};
use crate::run::ConversionRun;
use crate::segment_files::{INIT_SEGMENT_FILE_NAME, segment_file_name};

/// A request within this long ago keeps an entry out of eviction.
pub const RECENT_REQUEST: Duration = Duration::from_secs(10 * 60);
/// The last-used time on disk is refreshed at most this often.
const TOUCH_INTERVAL: Duration = Duration::from_secs(60);
/// How much of ffmpeg's standard error is kept for diagnosis.
const STDERR_CAPACITY: usize = 16 * 1024;

pub struct ConversionEntry {
    pub key: ConversionKey,
    pub dir: PathBuf,
    pub manifest: Manifest,
    pub playlist: String,
    pub run: tokio::sync::Mutex<Option<ConversionRun>>,
    /// Bumped whenever a segment or the init segment lands in the directory.
    pub produced: watch::Sender<u64>,
    pub stderr: Arc<Mutex<String>>,
    waiters: AtomicUsize,
    last_request: Mutex<Instant>,
    last_touch: Mutex<Option<Instant>>,
}

impl ConversionEntry {
    pub fn new(key: ConversionKey, dir: PathBuf, manifest: Manifest) -> Self {
        let playlist = render_vod_playlist(
            &manifest.segment_plan,
            INIT_SEGMENT_FILE_NAME,
            segment_file_name,
        );
        Self {
            key,
            dir,
            manifest,
            playlist,
            run: tokio::sync::Mutex::new(None),
            produced: watch::channel(0).0,
            stderr: Arc::new(Mutex::new(String::new())),
            waiters: AtomicUsize::new(0),
            last_request: Mutex::new(Instant::now()),
            last_touch: Mutex::new(None),
        }
    }

    pub fn init_segment_path(&self) -> PathBuf {
        self.dir.join(INIT_SEGMENT_FILE_NAME)
    }

    pub fn segment_path(&self, index: usize) -> PathBuf {
        self.dir.join(segment_file_name(index))
    }

    pub fn segment_count(&self) -> usize {
        self.manifest.segment_plan.segments.len()
    }

    pub fn notify_produced(&self) {
        self.produced.send_modify(|generation| *generation += 1);
    }

    /// Records a request, and refreshes the manifest's modification time now and then, which
    /// is the last-used time eviction orders entries by.
    pub fn record_request(&self) {
        let now = Instant::now();
        if let Ok(mut last_request) = self.last_request.lock() {
            *last_request = now;
        }
        let due = self
            .last_touch
            .lock()
            .map(|last| last.is_none_or(|last| now.duration_since(last) >= TOUCH_INTERVAL))
            .unwrap_or(false);
        if due {
            self.touch(now);
        }
    }

    fn touch(&self, now: Instant) {
        if let Ok(mut last_touch) = self.last_touch.lock() {
            *last_touch = Some(now);
        }
        let touched = std::fs::File::options()
            .write(true)
            .open(manifest_path(&self.dir))
            .and_then(|file| file.set_modified(SystemTime::now()));
        if let Err(error) = touched {
            tracing::debug!("could not touch the manifest of {}: {error}", self.key);
        }
    }

    /// Counts a request as waiting for a segment until the guard is dropped.
    pub fn waiting(&self) -> WaiterGuard<'_> {
        self.waiters.fetch_add(1, Ordering::SeqCst);
        WaiterGuard { entry: self }
    }

    /// True when eviction must leave the entry alone.
    pub async fn is_in_use(&self) -> bool {
        if self.waiters.load(Ordering::SeqCst) > 0 {
            return true;
        }
        let recently_requested = self
            .last_request
            .lock()
            .map(|last| last.elapsed() < RECENT_REQUEST)
            .unwrap_or(true);
        if recently_requested {
            return true;
        }
        self.run
            .lock()
            .await
            .as_ref()
            .is_some_and(|run| !run.is_finished())
    }

    /// Appends ffmpeg output, dropping the oldest text once the buffer is full.
    pub fn append_stderr(buffer: &Mutex<String>, text: &str) {
        if let Ok(mut stderr) = buffer.lock() {
            stderr.push_str(text);
            if stderr.len() > STDERR_CAPACITY {
                let excess = stderr.len() - STDERR_CAPACITY;
                let cut = stderr
                    .char_indices()
                    .map(|(index, _)| index)
                    .find(|&index| index >= excess)
                    .unwrap_or(stderr.len());
                stderr.drain(..cut);
            }
        }
    }

    pub fn stderr_text(&self) -> String {
        self.stderr
            .lock()
            .map(|text| text.clone())
            .unwrap_or_default()
    }
}

pub struct WaiterGuard<'a> {
    entry: &'a ConversionEntry,
}

impl Drop for WaiterGuard<'_> {
    fn drop(&mut self) {
        self.entry.waiters.fetch_sub(1, Ordering::SeqCst);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_the_newest_stderr_text_within_the_capacity() {
        let buffer = Mutex::new(String::new());
        ConversionEntry::append_stderr(&buffer, &"a".repeat(STDERR_CAPACITY));
        ConversionEntry::append_stderr(&buffer, "end");
        let text = buffer.lock().expect("lock");
        assert!(text.len() == STDERR_CAPACITY && text.ends_with("end"));
    }
}
