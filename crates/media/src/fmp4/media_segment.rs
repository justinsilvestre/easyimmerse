//! Reading decode times from an fMP4 media segment (an `.m4s` file holding movie fragments).

use std::collections::BTreeMap;

use super::boxes::{Mp4Box, find_box, parse_boxes};
use super::error::Fmp4Error;

/// Returns, keyed by track id, the decode time of each track's first sample in the segment.
/// Each time is a count of units of the track's timescale, as read from the track fragment decode time (`tfdt`) box.
/// In video whose frames are stored out of display order, a decode time can be slightly earlier than the presentation time of the same frame.
pub fn read_first_decode_times(segment: &[u8]) -> Result<BTreeMap<u32, u64>, Fmp4Error> {
    let moofs = boxes_of_kind(&parse_boxes(segment)?, b"moof");
    if moofs.is_empty() {
        return Err(Fmp4Error::MissingBox("moof".to_owned()));
    }
    let mut decode_times = BTreeMap::new();
    for moof in moofs {
        for traf in boxes_of_kind(&moof.children()?, b"traf") {
            let (track_id, decode_time) = read_track_fragment(&traf)?;
            decode_times.entry(track_id).or_insert(decode_time);
        }
    }
    if decode_times.is_empty() {
        return Err(Fmp4Error::MissingBox("traf".to_owned()));
    }
    Ok(decode_times)
}

fn boxes_of_kind<'a>(boxes: &[Mp4Box<'a>], kind: &[u8; 4]) -> Vec<Mp4Box<'a>> {
    boxes
        .iter()
        .filter(|candidate| &candidate.kind == kind)
        .copied()
        .collect()
}

fn read_track_fragment(traf: &Mp4Box) -> Result<(u32, u64), Fmp4Error> {
    let children = traf.children()?;
    let track_id = find_box(&children, b"tfhd")?.read_u32(4)?;
    Ok((track_id, read_decode_time(&find_box(&children, b"tfdt")?)?))
}

/// Reads the base media decode time, which is 32-bit in version 0 of the box and 64-bit in version 1.
fn read_decode_time(tfdt: &Mp4Box) -> Result<u64, Fmp4Error> {
    match tfdt.version()? {
        1 => tfdt.read_u64(4),
        _ => tfdt.read_u32(4).map(u64::from),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fmp4::test_boxes::{full_box, mp4_box, traf};

    fn moof(trafs: &[Vec<u8>]) -> Vec<u8> {
        let mfhd = full_box(b"mfhd", 0, &1u32.to_be_bytes());
        mp4_box(b"moof", &[mfhd, trafs.concat()].concat())
    }

    #[test]
    fn reads_the_decode_time_of_each_track() {
        let segment = [
            moof(&[traf(1, 36036), traf(2, 72000)]),
            mp4_box(b"mdat", &[0; 4]),
        ]
        .concat();
        let expected = BTreeMap::from([(1, 36036), (2, 72000)]);
        assert_eq!(read_first_decode_times(&segment), Ok(expected));
    }

    #[test]
    fn reads_a_32_bit_decode_time() {
        let tfhd = full_box(b"tfhd", 0, &1u32.to_be_bytes());
        let tfdt = full_box(b"tfdt", 0, &512u32.to_be_bytes());
        let segment = moof(&[mp4_box(b"traf", &[tfhd, tfdt].concat())]);
        assert_eq!(
            read_first_decode_times(&segment),
            Ok(BTreeMap::from([(1, 512)]))
        );
    }

    #[test]
    fn reads_a_64_bit_decode_time() {
        let segment = moof(&[traf(1, 1 << 40)]);
        assert_eq!(
            read_first_decode_times(&segment),
            Ok(BTreeMap::from([(1, 1 << 40)]))
        );
    }

    #[test]
    fn keeps_the_first_fragment_of_each_track() {
        let segment = [
            moof(&[traf(1, 100)]),
            mp4_box(b"mdat", &[]),
            moof(&[traf(1, 200)]),
        ]
        .concat();
        assert_eq!(
            read_first_decode_times(&segment),
            Ok(BTreeMap::from([(1, 100)]))
        );
    }

    #[test]
    fn rejects_a_segment_without_fragments() {
        let segment = mp4_box(b"mdat", &[0; 4]);
        assert_eq!(
            read_first_decode_times(&segment),
            Err(Fmp4Error::MissingBox("moof".to_owned()))
        );
    }

    #[test]
    fn rejects_a_fragment_without_track_fragments() {
        let segment = moof(&[]);
        assert_eq!(
            read_first_decode_times(&segment),
            Err(Fmp4Error::MissingBox("traf".to_owned()))
        );
    }

    #[test]
    fn rejects_a_track_fragment_without_a_decode_time() {
        let tfhd = full_box(b"tfhd", 0, &1u32.to_be_bytes());
        let segment = moof(&[mp4_box(b"traf", &tfhd)]);
        assert_eq!(
            read_first_decode_times(&segment),
            Err(Fmp4Error::MissingBox("tfdt".to_owned()))
        );
    }
}
