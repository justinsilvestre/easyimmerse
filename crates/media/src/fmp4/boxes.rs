//! Splitting MP4 data into boxes and reading big-endian fields from their payloads.
//! An MP4 box starts with a 32-bit size and a four-character type; a size of 1 means a 64-bit size follows, and a size of 0 means the box runs to the end of the data.

use super::error::Fmp4Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct Mp4Box<'a> {
    pub kind: [u8; 4],
    pub payload: &'a [u8],
}

impl<'a> Mp4Box<'a> {
    pub fn children(&self) -> Result<Vec<Mp4Box<'a>>, Fmp4Error> {
        parse_boxes(self.payload)
    }

    /// Returns the version byte that starts the payload of a full box.
    pub fn version(&self) -> Result<u8, Fmp4Error> {
        self.field::<1>(0).map(|[version]| version)
    }

    pub fn read_u32(&self, offset: usize) -> Result<u32, Fmp4Error> {
        self.field(offset).map(u32::from_be_bytes)
    }

    pub fn read_u64(&self, offset: usize) -> Result<u64, Fmp4Error> {
        self.field(offset).map(u64::from_be_bytes)
    }

    pub fn name(&self) -> String {
        box_name(&self.kind)
    }

    fn field<const N: usize>(&self, offset: usize) -> Result<[u8; N], Fmp4Error> {
        offset
            .checked_add(N)
            .and_then(|end| self.payload.get(offset..end))
            .and_then(|bytes| bytes.try_into().ok())
            .ok_or_else(|| Fmp4Error::TruncatedBox(self.name()))
    }
}

/// Splits data into the sequence of boxes it holds.
pub(crate) fn parse_boxes(bytes: &[u8]) -> Result<Vec<Mp4Box<'_>>, Fmp4Error> {
    let mut boxes = Vec::new();
    let mut rest = bytes;
    while !rest.is_empty() {
        let (parsed, remainder) = split_box(rest)?;
        boxes.push(parsed);
        rest = remainder;
    }
    Ok(boxes)
}

/// Returns the first box of the given type.
pub(crate) fn find_box<'a>(boxes: &[Mp4Box<'a>], kind: &[u8; 4]) -> Result<Mp4Box<'a>, Fmp4Error> {
    boxes
        .iter()
        .find(|candidate| &candidate.kind == kind)
        .copied()
        .ok_or_else(|| Fmp4Error::MissingBox(box_name(kind)))
}

pub(crate) fn box_name(kind: &[u8; 4]) -> String {
    String::from_utf8_lossy(kind).into_owned()
}

fn split_box(bytes: &[u8]) -> Result<(Mp4Box<'_>, &[u8]), Fmp4Error> {
    let header = bytes.get(..8).ok_or_else(|| truncated(bytes))?;
    let kind: [u8; 4] = [header[4], header[5], header[6], header[7]];
    let (header_length, size) =
        match u32::from_be_bytes([header[0], header[1], header[2], header[3]]) {
            0 => (8, bytes.len() as u64),
            1 => (16, read_large_size(bytes)?),
            size => (8, u64::from(size)),
        };
    let size = usize::try_from(size).map_err(|_| truncated(bytes))?;
    if size < header_length || size > bytes.len() {
        return Err(Fmp4Error::TruncatedBox(box_name(&kind)));
    }
    let payload = &bytes[header_length..size];
    Ok((Mp4Box { kind, payload }, &bytes[size..]))
}

fn read_large_size(bytes: &[u8]) -> Result<u64, Fmp4Error> {
    bytes
        .get(8..16)
        .and_then(|size| size.try_into().ok())
        .map(u64::from_be_bytes)
        .ok_or_else(|| truncated(bytes))
}

/// Describes a box whose header is cut short, naming its type when enough bytes remain to read it.
fn truncated(bytes: &[u8]) -> Fmp4Error {
    let name = bytes.get(4..8).map_or_else(
        || "unnamed".to_owned(),
        |kind| String::from_utf8_lossy(kind).into_owned(),
    );
    Fmp4Error::TruncatedBox(name)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fmp4::test_boxes::mp4_box;

    fn kinds(bytes: &[u8]) -> Vec<String> {
        let boxes = parse_boxes(bytes).expect("parse");
        boxes.iter().map(Mp4Box::name).collect()
    }

    #[test]
    fn splits_consecutive_boxes() {
        let bytes = [mp4_box(b"ftyp", b"isom"), mp4_box(b"moov", &[])].concat();
        assert_eq!(kinds(&bytes), ["ftyp", "moov"]);
    }

    #[test]
    fn reads_a_box_with_a_64_bit_size() {
        let bytes = [
            &1u32.to_be_bytes()[..],
            b"mdat",
            &20u64.to_be_bytes(),
            b"data",
        ]
        .concat();
        let boxes = parse_boxes(&bytes).expect("parse");
        assert_eq!(boxes[0].payload, b"data");
    }

    #[test]
    fn reads_a_box_that_runs_to_the_end_of_the_data() {
        let bytes = [&0u32.to_be_bytes()[..], b"mdat", b"rest"].concat();
        let boxes = parse_boxes(&bytes).expect("parse");
        assert_eq!(boxes[0].payload, b"rest");
    }

    #[test]
    fn rejects_a_box_larger_than_the_data() {
        let mut bytes = mp4_box(b"moof", b"abcd");
        bytes.truncate(10);
        assert_eq!(
            parse_boxes(&bytes),
            Err(Fmp4Error::TruncatedBox("moof".to_owned()))
        );
    }

    #[test]
    fn rejects_a_size_smaller_than_the_header() {
        let bytes = [&4u32.to_be_bytes()[..], b"moof"].concat();
        assert_eq!(
            parse_boxes(&bytes),
            Err(Fmp4Error::TruncatedBox("moof".to_owned()))
        );
    }

    #[test]
    fn rejects_a_header_cut_short() {
        assert_eq!(
            parse_boxes(&[0, 0, 0]),
            Err(Fmp4Error::TruncatedBox("unnamed".to_owned()))
        );
    }

    #[test]
    fn reports_a_missing_box() {
        let bytes = mp4_box(b"ftyp", &[]);
        let boxes = parse_boxes(&bytes).expect("parse");
        assert_eq!(
            find_box(&boxes, b"moov"),
            Err(Fmp4Error::MissingBox("moov".to_owned()))
        );
    }

    #[test]
    fn rejects_a_field_past_the_end_of_the_payload() {
        let parsed = Mp4Box {
            kind: *b"tfdt",
            payload: &[0; 6],
        };
        assert_eq!(
            parsed.read_u32(4),
            Err(Fmp4Error::TruncatedBox("tfdt".to_owned()))
        );
    }
}
