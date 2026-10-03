//! A minimal walker over ISO base media file format boxes.

use crate::error::MediaError;

const HEADER_LENGTH: usize = 8;
const LARGE_SIZE_LENGTH: usize = 8;
/// The version byte and three flag bytes at the start of a full box's payload.
pub(crate) const FULL_BOX_HEADER_LENGTH: usize = 4;

pub(crate) struct Box<'a> {
    pub kind: [u8; 4],
    pub payload: &'a [u8],
}

/// Splits a byte range into the boxes it holds, in order.
pub(crate) fn boxes(bytes: &[u8]) -> Result<Vec<Box<'_>>, MediaError> {
    let mut found = Vec::new();
    let mut rest = bytes;
    while !rest.is_empty() {
        let (found_box, remaining) = split_first_box(rest)?;
        found.push(found_box);
        rest = remaining;
    }
    Ok(found)
}

/// The payloads of every box of one kind among the given boxes.
pub(crate) fn children<'a>(parent: &'a [u8], kind: &[u8; 4]) -> Result<Vec<&'a [u8]>, MediaError> {
    Ok(boxes(parent)?
        .into_iter()
        .filter(|found| &found.kind == kind)
        .map(|found| found.payload)
        .collect())
}

/// The payload of the first box of one kind, which must be present.
pub(crate) fn child<'a>(parent: &'a [u8], kind: &[u8; 4]) -> Result<&'a [u8], MediaError> {
    children(parent, kind)?.into_iter().next().ok_or_else(|| {
        MediaError::InvalidFragmentedMp4(format!("missing {} box", String::from_utf8_lossy(kind)))
    })
}

fn split_first_box(bytes: &[u8]) -> Result<(Box<'_>, &[u8]), MediaError> {
    let header: [u8; HEADER_LENGTH] = bytes
        .get(..HEADER_LENGTH)
        .and_then(|header| header.try_into().ok())
        .ok_or_else(|| MediaError::InvalidFragmentedMp4("truncated box header".to_owned()))?;
    let kind = [header[4], header[5], header[6], header[7]];
    let (size, payload_start) =
        match u32::from_be_bytes([header[0], header[1], header[2], header[3]]) {
            0 => (bytes.len(), HEADER_LENGTH),
            1 => (read_large_size(bytes)?, HEADER_LENGTH + LARGE_SIZE_LENGTH),
            size => (size as usize, HEADER_LENGTH),
        };
    if size < payload_start || size > bytes.len() {
        return Err(MediaError::InvalidFragmentedMp4(format!(
            "box {} has size {size} in {} bytes",
            String::from_utf8_lossy(&kind),
            bytes.len()
        )));
    }
    let found = Box {
        kind,
        payload: &bytes[payload_start..size],
    };
    Ok((found, &bytes[size..]))
}

fn read_large_size(bytes: &[u8]) -> Result<usize, MediaError> {
    let size = read_u64(bytes, HEADER_LENGTH)?;
    usize::try_from(size)
        .map_err(|_| MediaError::InvalidFragmentedMp4("box size exceeds memory".to_owned()))
}

pub(crate) fn read_u32(bytes: &[u8], offset: usize) -> Result<u32, MediaError> {
    let slice: [u8; 4] = bytes
        .get(offset..offset + 4)
        .and_then(|slice| slice.try_into().ok())
        .ok_or_else(|| MediaError::InvalidFragmentedMp4("truncated field".to_owned()))?;
    Ok(u32::from_be_bytes(slice))
}

pub(crate) fn read_u64(bytes: &[u8], offset: usize) -> Result<u64, MediaError> {
    let slice: [u8; 8] = bytes
        .get(offset..offset + 8)
        .and_then(|slice| slice.try_into().ok())
        .ok_or_else(|| MediaError::InvalidFragmentedMp4("truncated field".to_owned()))?;
    Ok(u64::from_be_bytes(slice))
}

#[cfg(test)]
pub(crate) mod test_support {
    pub fn make_box(kind: &[u8; 4], payload: &[u8]) -> Vec<u8> {
        let mut bytes = ((payload.len() + 8) as u32).to_be_bytes().to_vec();
        bytes.extend_from_slice(kind);
        bytes.extend_from_slice(payload);
        bytes
    }

    pub fn make_full_box(kind: &[u8; 4], version: u8, body: &[u8]) -> Vec<u8> {
        let mut payload = vec![version, 0, 0, 0];
        payload.extend_from_slice(body);
        make_box(kind, &payload)
    }
}

#[cfg(test)]
mod tests {
    use super::test_support::make_box;
    use super::*;

    #[test]
    fn splits_consecutive_boxes() {
        let mut bytes = make_box(b"ftyp", b"isom");
        bytes.extend(make_box(b"free", b""));
        let kinds: Vec<[u8; 4]> = boxes(&bytes)
            .expect("boxes")
            .into_iter()
            .map(|b| b.kind)
            .collect();
        assert_eq!(kinds, [*b"ftyp", *b"free"]);
    }

    #[test]
    fn reads_a_box_with_a_64_bit_size() {
        let mut bytes = 1u32.to_be_bytes().to_vec();
        bytes.extend_from_slice(b"mdat");
        bytes.extend_from_slice(&19u64.to_be_bytes());
        bytes.extend_from_slice(b"abc");
        assert_eq!(boxes(&bytes).expect("boxes")[0].payload, b"abc");
    }

    #[test]
    fn reads_a_box_whose_size_zero_means_to_the_end() {
        let mut bytes = 0u32.to_be_bytes().to_vec();
        bytes.extend_from_slice(b"mdat");
        bytes.extend_from_slice(b"rest of file");
        assert_eq!(boxes(&bytes).expect("boxes")[0].payload, b"rest of file");
    }

    #[test]
    fn rejects_a_box_longer_than_the_data() {
        let mut bytes = 100u32.to_be_bytes().to_vec();
        bytes.extend_from_slice(b"moov");
        assert!(matches!(
            boxes(&bytes),
            Err(MediaError::InvalidFragmentedMp4(_))
        ));
    }

    #[test]
    fn reports_a_missing_child() {
        let bytes = make_box(b"moov", &make_box(b"mvhd", &[0; 100]));
        assert_eq!(
            child(child(&bytes, b"moov").expect("moov"), b"trak"),
            Err(MediaError::InvalidFragmentedMp4(
                "missing trak box".to_owned()
            ))
        );
    }
}
