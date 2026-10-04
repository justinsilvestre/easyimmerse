use std::io::Cursor;

use mp4::{Mp4Reader, Mp4Track};

use crate::container::{ContainerFormat, ContainerInfo, TrackInfo};
use crate::error::MediaError;
use crate::mp4_track::describe_mp4_track;

pub(crate) type BytesReader<'a> = Mp4Reader<Cursor<&'a [u8]>>;

const MILLIS_PER_SECOND: u64 = 1000;

/// Describes an MP4 file. Tracks with a sample entry other than `avc1` or `mp4a` make the
/// whole probe defer to ffprobe, which reads the profile data this reader does not parse.
pub(crate) fn probe_mp4(bytes: &[u8]) -> Result<ContainerInfo, MediaError> {
    let reader = open_mp4(bytes)?;
    if reader.timescale() == 0 {
        return Err(MediaError::InvalidMp4(
            "the movie header has a timescale of zero".to_owned(),
        ));
    }
    let duration_ms = reader.duration().as_millis() as u64;
    Ok(ContainerInfo {
        format: ContainerFormat::Mp4,
        duration_ms: Some(duration_ms),
        start_ms: None,
        bit_rate: overall_bit_rate(bytes.len() as u64, duration_ms),
        tracks: describe_tracks(&reader)?,
    })
}

pub(crate) fn open_mp4(bytes: &[u8]) -> Result<BytesReader<'_>, MediaError> {
    Mp4Reader::read_header(Cursor::new(bytes), bytes.len() as u64)
        .map_err(|error| MediaError::InvalidMp4(error.to_string()))
}

/// Stream indexes follow the order of the `trak` boxes, which ffmpeg also uses. The reader keeps
/// tracks in a map, so this falls back to ordering by track id, which almost always agrees.
fn describe_tracks(reader: &BytesReader<'_>) -> Result<Vec<TrackInfo>, MediaError> {
    let mut tracks: Vec<&Mp4Track> = reader.tracks().values().collect();
    tracks.sort_by_key(|track| track.track_id());
    tracks
        .into_iter()
        .enumerate()
        .map(|(index, track)| describe_mp4_track(index as u32, track))
        .collect()
}

fn overall_bit_rate(file_size: u64, duration_ms: u64) -> Option<u64> {
    (duration_ms > 0).then(|| file_size * 8 * MILLIS_PER_SECOND / duration_ms)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::container::TrackKind;
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
    fn numbers_streams_from_zero() {
        let indexes: Vec<u32> = probe_fixture().tracks.iter().map(|t| t.index).collect();
        assert_eq!(indexes, [0, 1, 2]);
    }

    #[test]
    fn keeps_the_mp4_track_ids() {
        let ids: Vec<Option<u32>> = probe_fixture()
            .tracks
            .iter()
            .map(|t| t.container_track_id)
            .collect();
        assert_eq!(ids, [Some(1), Some(2), Some(3)]);
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
    fn reads_a_five_second_duration() {
        assert_eq!(probe_fixture().duration_ms, Some(5000));
    }

    #[test]
    fn estimates_the_overall_bit_rate_from_the_file_size() {
        let bit_rate = probe_fixture().bit_rate.expect("bit rate");
        assert!((70_000..90_000).contains(&bit_rate), "{bit_rate}");
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
