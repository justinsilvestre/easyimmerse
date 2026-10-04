//! The conversion service: one per server, owning the cache directory, the ffmpeg runs, the
//! encoder discovery result, and the waveform decoder.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use easyimmerse_media::{
    AudioAction, AudioTarget, ContainerInfo, ConversionPlan, ConversionSettings, TrackInfo,
    TrackSelection, VideoAction, WaveformResponse, plan_segments,
};
use easyimmerse_media_ffmpeg::{BinaryName, FfmpegPaths, list_keyframes, locate_binary};

use crate::cache_layout::CacheLayout;
use crate::encoder_discovery::EncoderDiscovery;
use crate::entry::ConversionEntry;
use crate::error::ConversionError;
use crate::key::{CONVERTER_VERSION, ConversionKey, conversion_key};
use crate::manifest::{Manifest, read_manifest, write_manifest};
use crate::source_identity::SourceIdentity;
use crate::waveform::WaveformDecoder;

/// How long a playback request waits for encoder discovery before planning without video
/// transcoding. Discovery takes well under a second on most machines.
const ENCODER_PATIENCE: Duration = Duration::from_secs(5);

#[derive(Clone)]
pub struct ConversionService {
    pub(crate) inner: Arc<ServiceInner>,
}

pub(crate) struct ServiceInner {
    pub ffmpeg: PathBuf,
    pub paths: FfmpegPaths,
    pub layout: CacheLayout,
    pub entries: tokio::sync::Mutex<HashMap<ConversionKey, Arc<ConversionEntry>>>,
    pub encoders: EncoderDiscovery,
    pub waveform: WaveformDecoder,
    pub last_eviction: Mutex<Option<Instant>>,
}

impl ConversionService {
    /// Prepares the cache directory. Fails when ffmpeg or ffprobe cannot be found, in which
    /// case the server runs without a conversion service. Call `start_encoder_discovery` and
    /// `start_cache_cleanup` afterwards from within the async runtime.
    pub fn open(cache_dir: PathBuf, paths: FfmpegPaths) -> Result<Self, ConversionError> {
        let ffmpeg = locate_binary(BinaryName::Ffmpeg, &paths)?;
        locate_binary(BinaryName::Ffprobe, &paths)?;
        let layout = CacheLayout::new(cache_dir);
        layout.create()?;
        Ok(Self {
            inner: Arc::new(ServiceInner {
                waveform: WaveformDecoder::new(ffmpeg.clone()),
                encoders: EncoderDiscovery::pending(),
                ffmpeg,
                paths,
                layout,
                entries: tokio::sync::Mutex::new(HashMap::new()),
                last_eviction: Mutex::new(None),
            }),
        })
    }

    /// Runs the one-frame test encodes in the background.
    pub fn start_encoder_discovery(&self) {
        self.inner.encoders.start(self.inner.paths.clone());
    }

    /// The settings the playback planner uses: the preferred audio target, else AAC, and the
    /// discovered video encoder when there is one.
    pub async fn settings(
        &self,
        preferred_audio_target: Option<AudioTarget>,
    ) -> ConversionSettings {
        ConversionSettings {
            audio_target: preferred_audio_target.unwrap_or(AudioTarget::Aac),
            video_target: self.inner.encoders.video_target(ENCODER_PATIENCE).await,
        }
    }

    /// Registers a conversion and returns its key. An entry that already exists, in memory or
    /// on disk, is reused; otherwise the segment plan is read from the source and the entry's
    /// manifest is written.
    pub async fn register(
        &self,
        source: &Path,
        selection: TrackSelection,
        plan: ConversionPlan,
        container: &ContainerInfo,
    ) -> Result<ConversionKey, ConversionError> {
        let identity = read_identity(source).await?;
        let key = conversion_key(&identity, &selection, &plan);
        if let Ok(entry) = self.entry(&key).await {
            entry.record_request();
            return Ok(key);
        }
        let manifest = self
            .build_manifest(identity, selection, plan, container, &key)
            .await?;
        let dir = self.inner.layout.entry_dir(&key);
        {
            let dir = dir.clone();
            tokio::task::spawn_blocking(move || {
                std::fs::create_dir_all(&dir).map_err(ConversionError::cache_io(&dir))?;
                write_manifest(&dir, &manifest)
            })
            .await??;
        }
        self.entry(&key).await?;
        Ok(key)
    }

    async fn build_manifest(
        &self,
        source: SourceIdentity,
        selection: TrackSelection,
        plan: ConversionPlan,
        container: &ContainerInfo,
        key: &ConversionKey,
    ) -> Result<Manifest, ConversionError> {
        let video_index = plan.video.as_ref().map(video_index);
        let audio_index = plan.audio.as_ref().map(audio_index);
        let timing_stream = video_index
            .or(audio_index)
            .ok_or_else(|| ConversionError::EmptyPlan(key.to_string()))?;
        let path = source.path.clone();
        let paths = self.inner.paths.clone();
        let mut timing =
            tokio::task::spawn_blocking(move || list_keyframes(&path, timing_stream, &paths))
                .await??;
        if video_index.is_none() {
            timing.keyframe_ticks.clear();
        }
        let segment_plan = plan_segments(&timing);
        if segment_plan.segments.is_empty() {
            return Err(ConversionError::EmptyPlan(key.to_string()));
        }
        Ok(Manifest {
            converter_version: CONVERTER_VERSION,
            source,
            selection,
            plan,
            segment_plan,
            video_codec: video_index
                .and_then(|index| container.track(index))
                .map(|track| track.codec.clone()),
        })
    }

    /// The entry for a key, loaded from its manifest on disk the first time it is used.
    pub(crate) async fn entry(
        &self,
        key: &ConversionKey,
    ) -> Result<Arc<ConversionEntry>, ConversionError> {
        let mut entries = self.inner.entries.lock().await;
        if let Some(entry) = entries.get(key) {
            return Ok(Arc::clone(entry));
        }
        let dir = self.inner.layout.entry_dir(key);
        let manifest = {
            let dir = dir.clone();
            tokio::task::spawn_blocking(move || read_manifest(&dir)).await?
        }
        .ok()
        .filter(|manifest| manifest.converter_version == CONVERTER_VERSION)
        .ok_or_else(|| ConversionError::UnknownKey(key.to_string()))?;
        let entry = Arc::new(ConversionEntry::new(key.clone(), dir, manifest));
        entries.insert(key.clone(), Arc::clone(&entry));
        Ok(entry)
    }

    /// The VOD playlist of a conversion, with segment URIs relative to the playlist.
    pub async fn playlist(&self, key: &ConversionKey) -> Result<String, ConversionError> {
        let entry = self.entry(key).await?;
        entry.record_request();
        Ok(entry.playlist.clone())
    }

    /// The peaks of the window `start_ms..end_ms` of an audio track in player time.
    pub async fn waveform(
        &self,
        source: &Path,
        track: &TrackInfo,
        start_ms: u64,
        end_ms: u64,
    ) -> Result<WaveformResponse, ConversionError> {
        self.inner
            .waveform
            .peaks(source, track, start_ms, end_ms)
            .await
    }

    /// The embedded text subtitle stream at `stream_index`, converted to WebVTT.
    pub async fn subtitle_vtt(
        &self,
        source: &Path,
        stream_index: u32,
    ) -> Result<String, ConversionError> {
        crate::subtitle_extraction::extract_subtitle_vtt(&self.inner.ffmpeg, source, stream_index)
            .await
    }

    /// Stops every ffmpeg process. Call this before the server stops accepting requests.
    pub async fn shutdown(&self) {
        let entries: Vec<Arc<ConversionEntry>> =
            self.inner.entries.lock().await.values().cloned().collect();
        for entry in entries {
            if let Some(run) = entry.run.lock().await.take() {
                run.stop().await;
            }
        }
    }

    /// The text ffmpeg wrote to standard error while converting an entry, for diagnosis.
    pub async fn diagnostics(&self, key: &ConversionKey) -> Result<String, ConversionError> {
        Ok(self.entry(key).await?.stderr_text())
    }
}

async fn read_identity(source: &Path) -> Result<SourceIdentity, ConversionError> {
    let source = source.to_path_buf();
    tokio::task::spawn_blocking(move || SourceIdentity::read(&source)).await?
}

fn video_index(action: &VideoAction) -> u32 {
    match action {
        VideoAction::Copy { index } | VideoAction::Transcode { index, .. } => *index,
    }
}

fn audio_index(action: &AudioAction) -> u32 {
    match action {
        AudioAction::Copy { index } | AudioAction::Transcode { index, .. } => *index,
    }
}
