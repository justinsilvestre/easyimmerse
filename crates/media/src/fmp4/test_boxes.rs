//! Builders for hand-made MP4 boxes in tests.

/// Encodes a box: a 32-bit size covering the whole box, the four-character type, then the payload.
pub fn mp4_box(kind: &[u8; 4], payload: &[u8]) -> Vec<u8> {
    let size = u32::try_from(payload.len() + 8).expect("test boxes are small");
    [&size.to_be_bytes()[..], kind, payload].concat()
}

/// Encodes a full box, whose payload starts with a one-byte version and three bytes of flags.
pub fn full_box(kind: &[u8; 4], version: u8, fields: &[u8]) -> Vec<u8> {
    mp4_box(kind, &[&[version, 0, 0, 0][..], fields].concat())
}

pub fn tkhd(version: u8, track_id: u32) -> Vec<u8> {
    let times = vec![0; if version == 1 { 16 } else { 8 }];
    full_box(
        b"tkhd",
        version,
        &[times, track_id.to_be_bytes().to_vec()].concat(),
    )
}

pub fn mdhd(version: u8, timescale: u32) -> Vec<u8> {
    let times = vec![0; if version == 1 { 16 } else { 8 }];
    full_box(
        b"mdhd",
        version,
        &[times, timescale.to_be_bytes().to_vec()].concat(),
    )
}

/// Encodes a `trak` box holding a track header and a media header.
pub fn trak(track_id: u32, timescale: u32) -> Vec<u8> {
    let mdia = mp4_box(b"mdia", &mdhd(0, timescale));
    mp4_box(b"trak", &[tkhd(0, track_id), mdia].concat())
}

/// Encodes a `traf` box whose decode time box has version 1 (a 64-bit time).
pub fn traf(track_id: u32, decode_time: u64) -> Vec<u8> {
    let tfhd = full_box(b"tfhd", 0, &track_id.to_be_bytes());
    let tfdt = full_box(b"tfdt", 1, &decode_time.to_be_bytes());
    mp4_box(b"traf", &[tfhd, tfdt].concat())
}
