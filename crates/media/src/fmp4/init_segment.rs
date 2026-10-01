//! Reading track timescales from an fMP4 init segment, the file that describes the tracks before any media data.

use std::collections::BTreeMap;

use super::boxes::{Mp4Box, find_box, parse_boxes};
use super::error::Fmp4Error;

/// Returns each track's timescale (the number of time units per second used by its timestamps), keyed by track id.
pub fn read_track_timescales(init: &[u8]) -> Result<BTreeMap<u32, u32>, Fmp4Error> {
    let moov = find_box(&parse_boxes(init)?, b"moov")?;
    moov.children()?
        .iter()
        .filter(|child| &child.kind == b"trak")
        .map(read_track_timescale)
        .collect()
}

fn read_track_timescale(trak: &Mp4Box) -> Result<(u32, u32), Fmp4Error> {
    let children = trak.children()?;
    let track_id = read_field_after_times(&find_box(&children, b"tkhd")?)?;
    let mdia = find_box(&children, b"mdia")?;
    let timescale = read_field_after_times(&find_box(&mdia.children()?, b"mdhd")?)?;
    Ok((track_id, timescale))
}

/// Reads the field that follows the creation and modification times in a `tkhd` or `mdhd` box.
/// Those times are 32-bit in version 0 of the box and 64-bit in version 1.
fn read_field_after_times(header: &Mp4Box) -> Result<u32, Fmp4Error> {
    let offset = if header.version()? == 1 { 20 } else { 12 };
    header.read_u32(offset)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fmp4::test_boxes::{mdhd, mp4_box, tkhd, trak};

    fn init_segment(moov_children: &[Vec<u8>]) -> Vec<u8> {
        [
            mp4_box(b"ftyp", b"iso6"),
            mp4_box(b"moov", &moov_children.concat()),
        ]
        .concat()
    }

    #[test]
    fn reads_the_timescale_of_each_track() {
        let init = init_segment(&[trak(1, 24000), trak(2, 48000)]);
        let expected = BTreeMap::from([(1, 24000), (2, 48000)]);
        assert_eq!(read_track_timescales(&init), Ok(expected));
    }

    #[test]
    fn reads_version_1_headers() {
        let mdia = mp4_box(b"mdia", &mdhd(1, 90000));
        let init = init_segment(&[mp4_box(b"trak", &[tkhd(1, 3), mdia].concat())]);
        assert_eq!(
            read_track_timescales(&init),
            Ok(BTreeMap::from([(3, 90000)]))
        );
    }

    #[test]
    fn ignores_boxes_other_than_tracks() {
        let init = init_segment(&[mp4_box(b"mvhd", &[0; 100]), trak(1, 1000)]);
        assert_eq!(
            read_track_timescales(&init),
            Ok(BTreeMap::from([(1, 1000)]))
        );
    }

    #[test]
    fn rejects_data_without_a_movie_box() {
        let bytes = mp4_box(b"ftyp", b"iso6");
        assert_eq!(
            read_track_timescales(&bytes),
            Err(Fmp4Error::MissingBox("moov".to_owned()))
        );
    }

    #[test]
    fn rejects_a_track_without_a_media_header() {
        let init = init_segment(&[mp4_box(
            b"trak",
            &[tkhd(0, 1), mp4_box(b"mdia", &[])].concat(),
        )]);
        assert_eq!(
            read_track_timescales(&init),
            Err(Fmp4Error::MissingBox("mdhd".to_owned()))
        );
    }
}
