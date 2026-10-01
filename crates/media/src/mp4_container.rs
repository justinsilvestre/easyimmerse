use std::io::Cursor;

use mp4::{Mp4Reader, Mp4Track, TrackType};

use crate::container::{ContainerFormat, ContainerInfo, parse_language_tag};
use crate::error::MediaError;
use crate::track_info::{AudioDetails, TrackInfo, TrackKind, VideoDetails};

pub(crate) type BytesReader<'a> = Mp4Reader<Cursor<&'a [u8]>>;

/// The track header (`tkhd`) flag that marks a track as enabled for playback.
const TKHD_FLAG_ENABLED: u32 = 1;

pub(crate) fn probe_mp4(bytes: &[u8]) -> Result<ContainerInfo, MediaError> {
    let reader = open_mp4(bytes)?;
    if reader.timescale() == 0 {
        return Err(MediaError::InvalidMp4(
            "the movie header has a timescale of zero".to_owned(),
        ));
    }
    let mut tracks: Vec<TrackInfo> = reader.tracks().values().map(describe_track).collect();
    tracks.sort_by_key(|track| track.id);
    Ok(ContainerInfo {
        format: ContainerFormat::Mp4,
        duration_ms: Some(reader.duration().as_millis() as u64),
        tracks,
    })
}

pub(crate) fn open_mp4(bytes: &[u8]) -> Result<BytesReader<'_>, MediaError> {
    Mp4Reader::read_header(Cursor::new(bytes), bytes.len() as u64)
        .map_err(|error| MediaError::InvalidMp4(error.to_string()))
}

fn describe_track(track: &Mp4Track) -> TrackInfo {
    let kind = track.track_type().map_or(TrackKind::Other, to_track_kind);
    let codec = track
        .media_type()
        .map_or_else(|_| "unknown".to_owned(), |media| media.to_string());
    TrackInfo {
        language: parse_language_tag(track.language()),
        is_default: track.trak.tkhd.flags & TKHD_FLAG_ENABLED != 0,
        video: (kind == TrackKind::Video).then(|| describe_video(track)),
        audio: (kind == TrackKind::Audio).then(|| describe_audio(track)),
        ..TrackInfo::new(track.track_id(), kind, codec)
    }
}

fn describe_video(track: &Mp4Track) -> VideoDetails {
    VideoDetails {
        width: Some(u32::from(track.width())),
        height: Some(u32::from(track.height())),
        ..VideoDetails::default()
    }
}

/// Reads the sample entry of an AAC track. Other audio codecs get empty details.
fn describe_audio(track: &Mp4Track) -> AudioDetails {
    let mp4a = track.trak.mdia.minf.stbl.stsd.mp4a.as_ref();
    AudioDetails {
        sample_rate: mp4a.map(|entry| u32::from(entry.samplerate.value())),
        channels: mp4a.map(|entry| u32::from(entry.channelcount)),
    }
}

fn to_track_kind(track_type: TrackType) -> TrackKind {
    match track_type {
        TrackType::Video => TrackKind::Video,
        TrackType::Audio => TrackKind::Audio,
        TrackType::Subtitle => TrackKind::Subtitle,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_bytes;

    fn probe_fixture() -> ContainerInfo {
        probe_mp4(&read_fixture_bytes("sample.mp4")).expect("the fixture should parse")
    }

    #[test]
    fn lists_three_tracks() {
        assert_eq!(probe_fixture().tracks.len(), 3);
    }

    #[test]
    fn lists_the_track_kinds_in_order() {
        let kinds: Vec<TrackKind> = probe_fixture().tracks.iter().map(|t| t.kind).collect();
        assert_eq!(
            kinds,
            [TrackKind::Video, TrackKind::Audio, TrackKind::Subtitle]
        );
    }

    #[test]
    fn tags_the_subtitle_track_as_english() {
        let subtitle = probe_fixture().tracks.remove(2);
        assert_eq!(subtitle.language, Some("eng".to_owned()));
    }

    #[test]
    fn leaves_the_video_language_undetermined() {
        let video = probe_fixture().tracks.remove(0);
        assert_eq!(video.language, None);
    }

    #[test]
    fn names_the_video_codec() {
        let video = probe_fixture().tracks.remove(0);
        assert_eq!(video.codec, "h264");
    }

    #[test]
    fn reads_the_video_dimensions() {
        let video = probe_fixture()
            .tracks
            .remove(0)
            .video
            .expect("video details");
        assert_eq!((video.width, video.height), (Some(320), Some(180)));
    }

    #[test]
    fn reads_the_audio_sample_rate() {
        let audio = probe_fixture()
            .tracks
            .remove(1)
            .audio
            .expect("audio details");
        assert_eq!(audio.sample_rate, Some(44100));
    }

    #[test]
    fn marks_the_enabled_tracks_as_default() {
        let defaults: Vec<bool> = probe_fixture()
            .tracks
            .iter()
            .map(|t| t.is_default)
            .collect();
        assert_eq!(defaults, [true, true, true]);
    }

    #[test]
    fn reads_a_five_second_duration() {
        assert_eq!(probe_fixture().duration_ms, Some(5000));
    }

    #[test]
    fn rejects_a_movie_header_with_a_zero_timescale() {
        let mut bytes = read_fixture_bytes("sample.mp4");
        let mvhd = find_box(&bytes, b"mvhd");
        let version = bytes[mvhd + 8];
        let timescale_offset = if version == 1 { mvhd + 28 } else { mvhd + 20 };
        bytes[timescale_offset..timescale_offset + 4].fill(0);
        assert!(matches!(probe_mp4(&bytes), Err(MediaError::InvalidMp4(_))));
    }

    /// The offset of the first box with the given type, found by scanning for its four-byte name.
    fn find_box(bytes: &[u8], name: &[u8; 4]) -> usize {
        bytes
            .windows(4)
            .position(|window| window == name)
            .expect("the fixture should contain the box")
            - 4
    }
}
