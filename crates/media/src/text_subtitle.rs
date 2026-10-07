//! Which embedded subtitle tracks hold text that ffmpeg can convert to SubRip.

use easyimmerse_core::timed_text::ConvertedFrom;

use crate::container::{TrackInfo, TrackKind};

/// ffmpeg's names for the text subtitle codecs other than ASS and SSA.
const OTHER_TEXT_CODECS: [&str; 5] = ["subrip", "srt", "webvtt", "mov_text", "text"];

/// The text format of a subtitle track, or `None` for a track that holds no text,
/// such as a PGS or DVD subtitle track made of pictures.
pub fn text_subtitle_format(track: &TrackInfo) -> Option<ConvertedFrom> {
    if track.kind != TrackKind::Subtitle {
        return None;
    }
    match track.codec.as_str() {
        "ass" | "ssa" => Some(ConvertedFrom::Ass),
        codec if OTHER_TEXT_CODECS.contains(&codec) => Some(ConvertedFrom::OtherText),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn track(kind: TrackKind, codec: &str) -> TrackInfo {
        TrackInfo {
            kind,
            codec: codec.to_owned(),
            ..TrackInfo::default()
        }
    }

    fn subtitle_format(codec: &str) -> Option<ConvertedFrom> {
        text_subtitle_format(&track(TrackKind::Subtitle, codec))
    }

    #[test]
    fn reads_an_ass_track_as_ass() {
        assert_eq!(subtitle_format("ass"), Some(ConvertedFrom::Ass));
    }

    #[test]
    fn reads_an_ssa_track_as_ass() {
        assert_eq!(subtitle_format("ssa"), Some(ConvertedFrom::Ass));
    }

    #[test]
    fn reads_the_other_text_codecs_as_other_text() {
        let formats: Vec<Option<ConvertedFrom>> = OTHER_TEXT_CODECS
            .iter()
            .map(|codec| subtitle_format(codec))
            .collect();
        assert_eq!(formats, [Some(ConvertedFrom::OtherText); 5]);
    }

    #[test]
    fn finds_no_text_in_a_pgs_track() {
        assert_eq!(subtitle_format("hdmv_pgs_subtitle"), None);
    }

    #[test]
    fn finds_no_text_in_a_dvd_subtitle_track() {
        assert_eq!(subtitle_format("dvd_subtitle"), None);
    }

    #[test]
    fn finds_no_subtitle_text_in_an_audio_track() {
        assert_eq!(text_subtitle_format(&track(TrackKind::Audio, "ass")), None);
    }
}
