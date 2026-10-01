//! The video encoders this application can use to convert video, and where each one applies.

/// A video encoder that ffmpeg may provide.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum VideoEncoder {
    /// Apple's H.264 encoder, which falls back to software when the hardware encoder is unavailable.
    VideoToolboxH264,
}

/// Each candidate encoder with the operating system it is tried on, in order of preference.
const CANDIDATES: &[(VideoEncoder, &str)] = &[(VideoEncoder::VideoToolboxH264, "macos")];

impl VideoEncoder {
    /// Returns the name ffmpeg uses for this encoder.
    pub fn ffmpeg_name(self) -> &'static str {
        match self {
            VideoEncoder::VideoToolboxH264 => "h264_videotoolbox",
        }
    }

    /// Returns the ffmpeg output arguments that select this encoder.
    pub fn encoder_arguments(self) -> &'static [&'static str] {
        match self {
            VideoEncoder::VideoToolboxH264 => &["-c:v", "h264_videotoolbox", "-allow_sw", "1"],
        }
    }
}

/// Returns the encoders worth trying on the given operating system, named as in `std::env::consts::OS`.
pub(crate) fn candidate_video_encoders(operating_system: &str) -> Vec<VideoEncoder> {
    CANDIDATES
        .iter()
        .filter(|(_, candidate_os)| *candidate_os == operating_system)
        .map(|(encoder, _)| *encoder)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tries_videotoolbox_on_macos() {
        assert_eq!(
            candidate_video_encoders("macos"),
            [VideoEncoder::VideoToolboxH264]
        );
    }

    #[test]
    fn tries_nothing_on_an_operating_system_without_candidates() {
        assert!(candidate_video_encoders("linux").is_empty());
    }

    #[test]
    fn names_the_videotoolbox_encoder() {
        assert_eq!(
            VideoEncoder::VideoToolboxH264.ffmpeg_name(),
            "h264_videotoolbox"
        );
    }

    #[test]
    fn allows_the_software_fallback_for_videotoolbox() {
        assert_eq!(
            VideoEncoder::VideoToolboxH264.encoder_arguments(),
            ["-c:v", "h264_videotoolbox", "-allow_sw", "1"]
        );
    }
}
