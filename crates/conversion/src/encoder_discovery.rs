//! Finds a working hardware H.264 encoder once, in the background, at startup.

use std::time::Duration;

use easyimmerse_media::VideoTarget;
use easyimmerse_media_ffmpeg::{FfmpegPaths, find_working_h264_encoder};
use tokio::sync::watch;

/// The video target, once discovery has finished.
pub struct EncoderDiscovery {
    sender: watch::Sender<Option<Option<VideoTarget>>>,
    result: watch::Receiver<Option<Option<VideoTarget>>>,
}

impl EncoderDiscovery {
    /// A discovery that has not started; `start` runs it.
    pub fn pending() -> Self {
        let (sender, result) = watch::channel(None);
        Self { sender, result }
    }

    /// Starts discovery on the blocking thread pool and returns at once.
    pub fn start(&self, paths: FfmpegPaths) {
        let sender = self.sender.clone();
        tokio::task::spawn_blocking(move || {
            let target = match find_working_h264_encoder(&paths) {
                Ok(encoder) => encoder.map(|encoder| VideoTarget { encoder }),
                Err(error) => {
                    tracing::warn!("encoder discovery failed: {error}");
                    None
                }
            };
            match &target {
                Some(target) => tracing::info!("transcoding video with {}", target.encoder),
                None => {
                    tracing::info!("no working hardware H.264 encoder; video is not transcoded")
                }
            }
            let _ = sender.send(Some(target));
        });
    }

    /// A discovery that already knows its answer.
    #[cfg(test)]
    pub fn settled(target: Option<VideoTarget>) -> Self {
        let (sender, result) = watch::channel(Some(target));
        Self { sender, result }
    }

    /// Waits up to `patience` for discovery to finish. Until then there is no video target.
    pub async fn video_target(&self, patience: Duration) -> Option<VideoTarget> {
        let mut result = self.result.clone();
        let _ = tokio::time::timeout(patience, result.wait_for(|value| value.is_some())).await;
        let current = result.borrow().clone();
        current.flatten()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn answers_at_once_when_settled() {
        let discovery = EncoderDiscovery::settled(Some(VideoTarget {
            encoder: "h264_videotoolbox".to_owned(),
        }));
        assert_eq!(
            discovery.video_target(Duration::from_secs(1)).await,
            Some(VideoTarget {
                encoder: "h264_videotoolbox".to_owned()
            })
        );
    }

    #[tokio::test]
    async fn has_no_target_while_discovery_is_pending() {
        let discovery = EncoderDiscovery::pending();
        assert_eq!(
            discovery.video_target(Duration::from_millis(10)).await,
            None
        );
    }
}
