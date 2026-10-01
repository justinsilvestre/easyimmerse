//! Compares the packets of converted segments with the source's, segment by segment.

use super::converted_media::{AUDIO_TRACK_ID, ConvertedMedia, SEGMENT_COUNT, VIDEO_TRACK_ID};
use super::fmp4_samples::Sample;
use super::source_media::{VideoPacket, read_source_video_packets};
use super::{FIXTURE_NAME, fixture_path};

/// Returns the planned segments whose video packets differ in data or keyframe flags from the source's group of pictures (the packets from one keyframe up to the next) at the same position.
/// The service places each produced segment by its first decode time, so a match also shows that the decode times map to the planned segments.
pub fn mismatched_segments(media: &ConvertedMedia) -> Vec<usize> {
    let content = |groups: Vec<Vec<VideoPacket>>| -> Vec<Vec<(bool, String)>> {
        let content_of = |packet: VideoPacket| (packet.is_keyframe, packet.data_sha256);
        let group_content = |group: Vec<VideoPacket>| group.into_iter().map(content_of).collect();
        groups.into_iter().map(group_content).collect()
    };
    let (source, converted) = (content(source_groups()), content(converted_groups(media)));
    let count = source.len().max(converted.len());
    (0..count)
        .filter(|&index| source.get(index) != converted.get(index))
        .collect()
}

/// Returns, for each video packet whose converted presentation time differs from the source's, its segment and the difference in microseconds.
/// Panics when the converted segments do not hold the same number of packets as the source.
pub fn presentation_offsets(media: &ConvertedMedia) -> Vec<(usize, i64)> {
    let source = source_groups();
    let converted = converted_groups(media);
    let sizes = |groups: &[Vec<VideoPacket>]| groups.iter().map(Vec::len).collect::<Vec<_>>();
    assert_eq!(sizes(&source), sizes(&converted), "packets per segment");
    let mut offsets = Vec::new();
    for (index, (source, converted)) in source.iter().zip(&converted).enumerate() {
        for (source, converted) in source.iter().zip(converted) {
            let offset = converted.presentation_us - source.presentation_us;
            if offset != 0 {
                offsets.push((index, offset));
            }
        }
    }
    offsets
}

/// Returns, for each planned segment after the first, how many audio samples separate its first audio packet from the end of the previous segment's last one.
/// A negative number means the two overlap.
pub fn audio_gaps(media: &ConvertedMedia) -> Vec<(u32, i64)> {
    let segments = media.samples_by_segment(AUDIO_TRACK_ID);
    (1..SEGMENT_COUNT)
        .map(|index| {
            let previous = segments[index as usize - 1].last().expect("audio");
            let first = segments[index as usize].first().expect("audio");
            (
                index,
                first.decode_time - (previous.decode_time + previous.duration),
            )
        })
        .collect()
}

fn source_groups() -> Vec<Vec<VideoPacket>> {
    groups_of_pictures(read_source_video_packets(&fixture_path(FIXTURE_NAME)))
}

fn converted_groups(media: &ConvertedMedia) -> Vec<Vec<VideoPacket>> {
    let timescale = media.timescale(VIDEO_TRACK_ID);
    let samples = media.samples_by_segment(VIDEO_TRACK_ID);
    samples
        .iter()
        .map(|samples| packets(samples, timescale))
        .collect()
}

fn groups_of_pictures(packets: Vec<VideoPacket>) -> Vec<Vec<VideoPacket>> {
    let mut groups: Vec<Vec<VideoPacket>> = Vec::new();
    for packet in packets {
        match groups.last_mut() {
            Some(group) if !packet.is_keyframe => group.push(packet),
            _ => groups.push(vec![packet]),
        }
    }
    groups
}

fn packets(samples: &[Sample], timescale: u32) -> Vec<VideoPacket> {
    samples
        .iter()
        .map(|sample| VideoPacket::from_sample(sample, timescale))
        .collect()
}
