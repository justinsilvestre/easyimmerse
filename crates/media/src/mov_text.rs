//! Extraction of the subtitle cues stored in an MP4 `mov_text` (3GPP timed text) track.

use easyimmerse_core::timed_text::Cue;

use crate::error::MediaError;
use crate::mov_text_sample::decode_mov_text_sample;
use crate::mp4_container::{BytesReader, open_mp4};

/// Reads every sample of the given track and returns the non-empty ones as cues.
/// Empty samples encode the gaps between subtitles, so they produce no cue, and cue
/// indexes count only the cues returned.
pub fn extract_mov_text_cues(bytes: &[u8], track_id: u32) -> Result<Vec<Cue>, MediaError> {
    let mut reader = open_mp4(bytes)?;
    let (timescale, sample_count) = describe_track(&reader, track_id)?;
    let mut cues = Vec::new();
    for sample_id in 1..=sample_count {
        if let Some(cue) = read_cue(&mut reader, track_id, sample_id, timescale)? {
            cues.push(Cue {
                index: cues.len() as u32 + 1,
                ..cue
            });
        }
    }
    Ok(cues)
}

fn describe_track(reader: &BytesReader<'_>, track_id: u32) -> Result<(u64, u32), MediaError> {
    let track = reader
        .tracks()
        .get(&track_id)
        .ok_or(MediaError::TrackNotFound(track_id))?;
    Ok((u64::from(track.timescale()), track.sample_count()))
}

fn read_cue(
    reader: &mut BytesReader<'_>,
    track_id: u32,
    sample_id: u32,
    timescale: u64,
) -> Result<Option<Cue>, MediaError> {
    let Some(sample) = reader
        .read_sample(track_id, sample_id)
        .map_err(|error| MediaError::InvalidMp4(error.to_string()))?
    else {
        return Ok(None);
    };
    let text = decode_mov_text_sample(&sample.bytes).map_err(|source| {
        MediaError::InvalidMovTextSample {
            track_id,
            sample_id,
            source,
        }
    })?;
    Ok(text.map(|text| Cue {
        index: 0,
        start_ms: to_milliseconds(sample.start_time, timescale),
        end_ms: to_milliseconds(sample.start_time + u64::from(sample.duration), timescale),
        text,
    }))
}

fn to_milliseconds(ticks: u64, timescale: u64) -> u64 {
    if timescale == 0 {
        return 0;
    }
    (u128::from(ticks) * 1000 / u128::from(timescale)) as u64
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::timed_text::parse_timed_text;

    use super::*;
    use crate::container::probe_container;
    use crate::test_support::{read_fixture_bytes, read_fixture_text};
    use crate::track_info::TrackKind;

    fn subtitle_track_id(bytes: &[u8]) -> u32 {
        probe_container(bytes)
            .expect("probe")
            .tracks
            .into_iter()
            .find(|track| track.kind == TrackKind::Subtitle)
            .expect("the fixture has a subtitle track")
            .id
    }

    #[test]
    fn extracts_the_same_cues_as_the_srt_fixture() {
        let bytes = read_fixture_bytes("sample.mp4");
        let expected = parse_timed_text(&read_fixture_text("sample.srt"), None)
            .expect("srt")
            .cues;
        let cues = extract_mov_text_cues(&bytes, subtitle_track_id(&bytes)).expect("cues");
        assert_eq!(cues, expected);
    }

    #[test]
    fn reports_a_missing_track() {
        let result = extract_mov_text_cues(&read_fixture_bytes("sample.mp4"), 99);
        assert_eq!(result, Err(MediaError::TrackNotFound(99)));
    }

    #[test]
    fn converts_ticks_to_milliseconds_with_the_timescale() {
        assert_eq!(to_milliseconds(1_750_000, 1_000_000), 1750);
    }
}
