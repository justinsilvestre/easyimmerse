//! The few facts a conversion needs from fragmented MP4 output: each track's timescale from the
//! init segment, and each track fragment's first decode time from a media segment.

use crate::error::MediaError;
use crate::fmp4_boxes::{FULL_BOX_HEADER_LENGTH, child, children, read_u32, read_u64};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TrackTimescale {
    pub track_id: u32,
    pub timescale: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FragmentDecodeTime {
    pub track_id: u32,
    /// The `tfdt` value, in the track's timescale.
    pub decode_time: u64,
}

/// Reads the timescale of every track in an init segment (`moov/trak/mdia/mdhd`).
pub fn read_init_timescales(init_segment: &[u8]) -> Result<Vec<TrackTimescale>, MediaError> {
    let moov = child(init_segment, b"moov")?;
    children(moov, b"trak")?
        .into_iter()
        .map(|trak| {
            Ok(TrackTimescale {
                track_id: read_versioned_u32(child(trak, b"tkhd")?, 12, 20)?,
                timescale: read_versioned_u32(child(child(trak, b"mdia")?, b"mdhd")?, 12, 20)?,
            })
        })
        .collect()
}

/// Reads the first decode time of every track fragment (`moof/traf/tfdt`) in a media segment,
/// in file order.
pub fn read_first_decode_times(
    media_segment: &[u8],
) -> Result<Vec<FragmentDecodeTime>, MediaError> {
    let mut times = Vec::new();
    for moof in children(media_segment, b"moof")? {
        for traf in children(moof, b"traf")? {
            times.push(FragmentDecodeTime {
                track_id: read_u32(child(traf, b"tfhd")?, FULL_BOX_HEADER_LENGTH)?,
                decode_time: read_decode_time(child(traf, b"tfdt")?)?,
            });
        }
    }
    Ok(times)
}

/// Full boxes store 32-bit times in version 0 and 64-bit times in version 1, which moves the
/// fields that follow them.
fn read_versioned_u32(
    full_box: &[u8],
    offset_v0: usize,
    offset_v1: usize,
) -> Result<u32, MediaError> {
    let offset = if full_box.first() == Some(&1) {
        offset_v1
    } else {
        offset_v0
    };
    read_u32(full_box, offset)
}

fn read_decode_time(tfdt: &[u8]) -> Result<u64, MediaError> {
    if tfdt.first() == Some(&1) {
        read_u64(tfdt, FULL_BOX_HEADER_LENGTH)
    } else {
        read_u32(tfdt, FULL_BOX_HEADER_LENGTH).map(u64::from)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fmp4_boxes::test_support::{make_box, make_full_box};

    fn tkhd(version: u8, track_id: u32) -> Vec<u8> {
        let time_length = if version == 1 { 8 } else { 4 };
        let mut body = vec![0; 2 * time_length];
        body.extend_from_slice(&track_id.to_be_bytes());
        body.extend_from_slice(&[0; 60]);
        make_full_box(b"tkhd", version, &body)
    }

    fn mdhd(version: u8, timescale: u32) -> Vec<u8> {
        let time_length = if version == 1 { 8 } else { 4 };
        let mut body = vec![0; 2 * time_length];
        body.extend_from_slice(&timescale.to_be_bytes());
        body.extend_from_slice(&[0; 12]);
        make_full_box(b"mdhd", version, &body)
    }

    fn trak(version: u8, track_id: u32, timescale: u32) -> Vec<u8> {
        let mut payload = tkhd(version, track_id);
        payload.extend(make_box(b"mdia", &mdhd(version, timescale)));
        make_box(b"trak", &payload)
    }

    fn init_segment(version: u8) -> Vec<u8> {
        let mut moov = make_full_box(b"mvhd", 0, &[0; 96]);
        moov.extend(trak(version, 1, 12288));
        moov.extend(trak(version, 2, 44100));
        let mut bytes = make_box(b"ftyp", b"iso5");
        bytes.extend(make_box(b"moov", &moov));
        bytes
    }

    fn traf(track_id: u32, tfdt_version: u8, decode_time: u64) -> Vec<u8> {
        let mut payload = make_full_box(b"tfhd", 0, &track_id.to_be_bytes());
        let time = if tfdt_version == 1 {
            decode_time.to_be_bytes().to_vec()
        } else {
            (decode_time as u32).to_be_bytes().to_vec()
        };
        payload.extend(make_full_box(b"tfdt", tfdt_version, &time));
        make_box(b"traf", &payload)
    }

    fn media_segment(tfdt_version: u8) -> Vec<u8> {
        let mut moof = make_full_box(b"mfhd", 0, &1u32.to_be_bytes());
        moof.extend(traf(1, tfdt_version, 122_880));
        moof.extend(traf(2, tfdt_version, 441_000));
        let mut bytes = make_box(b"styp", b"msdh");
        bytes.extend(make_box(b"moof", &moof));
        bytes.extend(make_box(b"mdat", b"samples"));
        bytes
    }

    #[test]
    fn reads_the_timescale_of_each_track() {
        assert_eq!(
            read_init_timescales(&init_segment(0)).expect("init"),
            [
                TrackTimescale {
                    track_id: 1,
                    timescale: 12288
                },
                TrackTimescale {
                    track_id: 2,
                    timescale: 44100
                }
            ]
        );
    }

    #[test]
    fn reads_version_1_headers_with_64_bit_times() {
        let timescales = read_init_timescales(&init_segment(1)).expect("init");
        assert_eq!(timescales[1].timescale, 44100);
    }

    #[test]
    fn reads_the_first_decode_time_of_each_track_fragment() {
        assert_eq!(
            read_first_decode_times(&media_segment(1)).expect("segment"),
            [
                FragmentDecodeTime {
                    track_id: 1,
                    decode_time: 122_880
                },
                FragmentDecodeTime {
                    track_id: 2,
                    decode_time: 441_000
                }
            ]
        );
    }

    #[test]
    fn reads_a_version_0_decode_time() {
        let times = read_first_decode_times(&media_segment(0)).expect("segment");
        assert_eq!(times[0].decode_time, 122_880);
    }

    #[test]
    fn reports_an_init_segment_without_a_movie_box() {
        assert!(matches!(
            read_init_timescales(&make_box(b"ftyp", b"iso5")),
            Err(MediaError::InvalidFragmentedMp4(_))
        ));
    }
}
