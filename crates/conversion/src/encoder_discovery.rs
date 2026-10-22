//! Finds a working H.264 encoder once, in the background, at startup.

use std::time::Duration;

use easyimmerse_media::VideoTarget;
use easyimmerse_media_ffmpeg::{FfmpegPaths, find_working_h264_encoder, is_software_encoder};
use tokio::sync::watch;

/// How far encoder discovery has come, and what it found.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EncoderDiscoveryStatus {
    pub finished: bool,
    /// The encoder conversion uses. None while discovery runs or when no encoder works.
    pub encoder: Option<H264Encoder>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct H264Encoder {
    /// The ffmpeg encoder name, such as `h264_videotoolbox`.
    pub name: String,
    /// Whether the encoder runs on the processor rather than on video hardware.
    pub software: bool,
}

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
                None => tracing::info!("no working H.264 encoder; video is not transcoded"),
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

    /// What discovery has found so far, without waiting.
    pub fn status(&self) -> EncoderDiscoveryStatus {
        let current = self.result.borrow().clone();
        EncoderDiscoveryStatus {
            finished: current.is_some(),
            encoder: current.flatten().map(|target| H264Encoder {
                software: is_software_encoder(&target.encoder),
                name: target.encoder,
            }),
        }
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

    #[test]
    fn reports_a_pending_discovery_as_unfinished() {
        assert_eq!(
            EncoderDiscovery::pending().status(),
            EncoderDiscoveryStatus {
                finished: false,
                encoder: None
            }
        );
    }

    #[test]
    fn reports_a_software_encoder_as_software() {
        let discovery = EncoderDiscovery::settled(Some(VideoTarget {
            encoder: "libx264".to_owned(),
        }));
        assert_eq!(
            discovery.status().encoder,
            Some(H264Encoder {
                name: "libx264".to_owned(),
                software: true
            })
        );
    }

    #[test]
    fn reports_a_discovery_that_found_nothing_as_finished() {
        assert!(EncoderDiscovery::settled(None).status().finished);
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
