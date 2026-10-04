//! Container metadata per file, probed once with ffprobe and kept until the file changes.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use easyimmerse_media::ContainerInfo;
use easyimmerse_media_ffmpeg::{FfmpegPaths, probe_file};

use crate::error::ConversionError;
use crate::source_identity::SourceIdentity;

/// The cache is dropped when it grows past this, which only a very large library reaches.
const MAX_ENTRIES: usize = 1024;

pub struct ProbeCache {
    paths: FfmpegPaths,
    entries: Mutex<HashMap<PathBuf, (SourceIdentity, Arc<ContainerInfo>)>>,
}

impl ProbeCache {
    pub fn new(paths: FfmpegPaths) -> Self {
        Self {
            paths,
            entries: Mutex::new(HashMap::new()),
        }
    }

    /// Probes the file through ffprobe, or returns the cached result when the file's size and
    /// modification time are unchanged. Every file goes through ffprobe, so that the stream
    /// indexes are exactly the ones the conversion commands map.
    pub async fn probe(&self, path: &Path) -> Result<Arc<ContainerInfo>, ConversionError> {
        let path = path.to_path_buf();
        let paths = self.paths.clone();
        let identity = {
            let path = path.clone();
            tokio::task::spawn_blocking(move || SourceIdentity::read(&path)).await??
        };
        if let Some(info) = self.lookup(&identity) {
            return Ok(info);
        }
        let probed = {
            let path = path.clone();
            tokio::task::spawn_blocking(move || probe_file(&path, &paths)).await??
        };
        let info = Arc::new(probed);
        self.store(identity, Arc::clone(&info));
        Ok(info)
    }

    fn lookup(&self, identity: &SourceIdentity) -> Option<Arc<ContainerInfo>> {
        let entries = self.entries.lock().ok()?;
        entries
            .get(&identity.path)
            .filter(|(cached, _)| cached == identity)
            .map(|(_, info)| Arc::clone(info))
    }

    fn store(&self, identity: SourceIdentity, info: Arc<ContainerInfo>) {
        if let Ok(mut entries) = self.entries.lock() {
            if entries.len() >= MAX_ENTRIES {
                entries.clear();
            }
            entries.insert(identity.path.clone(), (identity, info));
        }
    }
}
