//! Reads every sample of fragmented MP4 (fMP4) media segments with its timing, sync flag, and bytes.
//! Players place samples by these fields, so tests read them directly rather than through ffprobe.
//! ffprobe shifts the presentation times of fragmented video whose composition offsets are negative.

/// One sample (a video frame or an audio packet) of an fMP4 media segment. Times are in units of the track's timescale.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Sample {
    pub track_id: u32,
    pub decode_time: i64,
    pub presentation_time: i64,
    pub duration: i64,
    /// Whether decoding can start at this sample, as for a keyframe.
    pub is_sync: bool,
    pub data: Vec<u8>,
}

const BASE_DATA_OFFSET_PRESENT: u32 = 0x1;
const SAMPLE_DESCRIPTION_INDEX_PRESENT: u32 = 0x2;
const DEFAULT_DURATION_PRESENT: u32 = 0x8;
const DEFAULT_SIZE_PRESENT: u32 = 0x10;
const DEFAULT_FLAGS_PRESENT: u32 = 0x20;
const DATA_OFFSET_PRESENT: u32 = 0x1;
const FIRST_SAMPLE_FLAGS_PRESENT: u32 = 0x4;
const DURATION_PRESENT: u32 = 0x100;
const SIZE_PRESENT: u32 = 0x200;
const FLAGS_PRESENT: u32 = 0x400;
const COMPOSITION_OFFSET_PRESENT: u32 = 0x800;
const NON_SYNC_SAMPLE: u32 = 0x1_0000;

/// Returns the timescale of each track in an init segment, keyed by track id.
pub fn read_timescales(init: &[u8]) -> Vec<(u32, u32)> {
    let moov = only_box(&parse_boxes(init), b"moov");
    let mut timescales = Vec::new();
    for trak in boxes_of_kind(&parse_boxes(moov.payload), b"trak") {
        let children = parse_boxes(trak.payload);
        let tkhd = only_box(&children, b"tkhd").payload;
        let track_id = read_u32(tkhd, if tkhd[0] == 1 { 20 } else { 12 });
        let mdia = parse_boxes(only_box(&children, b"mdia").payload);
        let mdhd = only_box(&mdia, b"mdhd").payload;
        let timescale_offset = if mdhd[0] == 1 { 20 } else { 12 };
        timescales.push((track_id, read_u32(mdhd, timescale_offset)));
    }
    timescales
}

/// Returns the samples of all tracks in a media segment, in the order they are stored.
pub fn read_samples(segment: &[u8]) -> Vec<Sample> {
    let mut samples = Vec::new();
    for moof in boxes_of_kind(&parse_boxes(segment), b"moof") {
        // Data offsets count from the start of the movie fragment box.
        let fragment = &segment[moof.start..];
        for traf in boxes_of_kind(&parse_boxes(moof.payload), b"traf") {
            samples.extend(read_track_fragment(traf.payload, fragment));
        }
    }
    samples
}

struct TrackFragmentHeader {
    track_id: u32,
    default_duration: Option<u32>,
    default_size: Option<u32>,
    default_flags: Option<u32>,
}

fn read_track_fragment(traf: &[u8], fragment: &[u8]) -> Vec<Sample> {
    let children = parse_boxes(traf);
    let header = read_track_fragment_header(only_box(&children, b"tfhd").payload);
    let tfdt = only_box(&children, b"tfdt").payload;
    let mut decode_time = if tfdt[0] == 1 {
        i64::try_from(read_u64(tfdt, 4))
            .expect("a decode time below 2^63, not a time before zero stored as unsigned")
    } else {
        i64::from(read_u32(tfdt, 4))
    };
    let mut samples = Vec::new();
    for trun in boxes_of_kind(&children, b"trun") {
        let run = read_track_run(trun.payload, &header, decode_time, fragment);
        decode_time += run.iter().map(|sample| sample.duration).sum::<i64>();
        samples.extend(run);
    }
    samples
}

fn read_track_fragment_header(tfhd: &[u8]) -> TrackFragmentHeader {
    let mut fields = Fields::after_version_and_flags(tfhd);
    let track_id = fields.next_u32();
    assert_eq!(
        fields.flags & BASE_DATA_OFFSET_PRESENT,
        0,
        "explicit base data offsets are not supported"
    );
    fields.skip_if(SAMPLE_DESCRIPTION_INDEX_PRESENT);
    TrackFragmentHeader {
        track_id,
        default_duration: fields.next_if(DEFAULT_DURATION_PRESENT),
        default_size: fields.next_if(DEFAULT_SIZE_PRESENT),
        default_flags: fields.next_if(DEFAULT_FLAGS_PRESENT),
    }
}

fn read_track_run(
    trun: &[u8],
    header: &TrackFragmentHeader,
    first_decode_time: i64,
    fragment: &[u8],
) -> Vec<Sample> {
    let mut fields = Fields::after_version_and_flags(trun);
    let sample_count = fields.next_u32();
    let data_offset = fields
        .next_if(DATA_OFFSET_PRESENT)
        .expect("a track run carries its data offset") as i32;
    let first_flags = fields.next_if(FIRST_SAMPLE_FLAGS_PRESENT);
    let mut data_position = usize::try_from(data_offset).expect("data follows the fragment box");
    let mut decode_time = first_decode_time;
    let mut samples = Vec::new();
    for position in 0..sample_count {
        let duration = fields.next_if(DURATION_PRESENT).or(header.default_duration);
        let size = fields.next_if(SIZE_PRESENT).or(header.default_size);
        let flags = fields.next_if(FLAGS_PRESENT);
        let flags = flags
            .or(first_flags.filter(|_| position == 0))
            .or(header.default_flags);
        // Version 1 of the box stores composition offsets as signed numbers.
        let offset = fields
            .next_if(COMPOSITION_OFFSET_PRESENT)
            .map_or(0, |offset| {
                if trun[0] == 1 {
                    i64::from(offset as i32)
                } else {
                    i64::from(offset)
                }
            });
        let duration = i64::from(duration.expect("each sample has a duration"));
        let size = size.expect("each sample has a size") as usize;
        samples.push(Sample {
            track_id: header.track_id,
            decode_time,
            presentation_time: decode_time + offset,
            duration,
            is_sync: flags.expect("each sample has flags") & NON_SYNC_SAMPLE == 0,
            data: fragment[data_position..data_position + size].to_vec(),
        });
        decode_time += duration;
        data_position += size;
    }
    samples
}

/// Reads the optional 32-bit fields of a full box in order, each present when its flag is set.
struct Fields<'a> {
    payload: &'a [u8],
    flags: u32,
    position: usize,
}

impl<'a> Fields<'a> {
    fn after_version_and_flags(payload: &'a [u8]) -> Self {
        let flags = read_u32(payload, 0) & 0x00ff_ffff;
        Fields {
            payload,
            flags,
            position: 4,
        }
    }

    fn next_u32(&mut self) -> u32 {
        let value = read_u32(self.payload, self.position);
        self.position += 4;
        value
    }

    fn next_if(&mut self, flag: u32) -> Option<u32> {
        (self.flags & flag != 0).then(|| self.next_u32())
    }

    fn skip_if(&mut self, flag: u32) {
        self.next_if(flag);
    }
}

#[derive(Clone, Copy)]
struct Mp4Box<'a> {
    kind: [u8; 4],
    /// The offset of the box's header within the data it was parsed from.
    start: usize,
    payload: &'a [u8],
}

fn parse_boxes(bytes: &[u8]) -> Vec<Mp4Box<'_>> {
    let mut boxes = Vec::new();
    let mut start = 0;
    while start < bytes.len() {
        let size = read_u32(bytes, start) as usize;
        assert!(
            size >= 8,
            "boxes of 64-bit or open-ended size are not supported"
        );
        let kind = bytes[start + 4..start + 8].try_into().expect("four bytes");
        let payload = &bytes[start + 8..start + size];
        boxes.push(Mp4Box {
            kind,
            start,
            payload,
        });
        start += size;
    }
    boxes
}

fn boxes_of_kind<'a>(boxes: &[Mp4Box<'a>], kind: &[u8; 4]) -> Vec<Mp4Box<'a>> {
    boxes
        .iter()
        .filter(|candidate| &candidate.kind == kind)
        .copied()
        .collect()
}

fn only_box<'a>(boxes: &[Mp4Box<'a>], kind: &[u8; 4]) -> Mp4Box<'a> {
    let mut matches = boxes_of_kind(boxes, kind);
    assert_eq!(
        matches.len(),
        1,
        "expected one {} box",
        String::from_utf8_lossy(kind)
    );
    matches.remove(0)
}

fn read_u32(bytes: &[u8], offset: usize) -> u32 {
    u32::from_be_bytes(bytes[offset..offset + 4].try_into().expect("four bytes"))
}

fn read_u64(bytes: &[u8], offset: usize) -> u64 {
    u64::from_be_bytes(bytes[offset..offset + 8].try_into().expect("eight bytes"))
}
