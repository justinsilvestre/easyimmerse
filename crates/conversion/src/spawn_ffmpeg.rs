//! Starting the ffmpeg process of one run.

use std::path::{Path, PathBuf};
use std::process::Stdio;

use easyimmerse_media_ffmpeg::{AacEncoder, HlsSource, HlsTracks, format_seconds, hls_arguments};
use tokio::process::{Child, Command};

use crate::conversion::Conversion;

/// The file inside a run directory that receives ffmpeg's error output.
pub const ERROR_LOG_NAME: &str = "ffmpeg-errors.log";

/// The ffmpeg binary and encoder that every run uses.
#[derive(Debug, Clone)]
pub struct RunSettings {
    pub ffmpeg: PathBuf,
    pub aac_encoder: AacEncoder,
}

/// Starts ffmpeg writing the conversion into the run directory from the planned segment `start_index`.
pub async fn spawn_ffmpeg(
    conversion: &Conversion,
    settings: &RunSettings,
    run_dir: &Path,
    start_index: u32,
) -> Result<Child, std::io::Error> {
    let manifest = &conversion.manifest;
    let start_seconds = (start_index > 0)
        .then(|| seek_seconds(conversion, start_index))
        .flatten();
    let source = HlsSource {
        path: &manifest.source_path,
        start_seconds: start_seconds.as_deref(),
    };
    let tracks = HlsTracks {
        video: manifest.video_track.as_ref(),
        audio: manifest.plan.audio.as_ref(),
    };
    let errors = tokio::fs::File::create(run_dir.join(ERROR_LOG_NAME))
        .await?
        .into_std()
        .await;
    let child = Command::new(&settings.ffmpeg)
        .args(["-nostdin", "-loglevel", "error", "-y"])
        .args(hls_arguments(
            &source,
            &tracks,
            settings.aac_encoder,
            run_dir,
        ))
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(errors)
        .kill_on_drop(true)
        .spawn()?;
    Ok(child)
}

/// The start of a planned segment as ffmpeg's `-ss` option expects it: seconds from the start of the file.
fn seek_seconds(conversion: &Conversion, index: u32) -> Option<String> {
    let plan = &conversion.manifest.segment_plan;
    let segment = plan.segments.get(usize::try_from(index).ok()?)?;
    let offset = segment.start_pts.saturating_sub(plan.timeline.start_pts);
    Some(format_seconds(offset, plan.timeline.timebase))
}
