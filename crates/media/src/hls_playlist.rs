//! The HLS media playlist (an `.m3u8` file) that lists a segment plan's files for a player.

use std::iter::once;

use crate::segment_plan::SegmentPlan;

/// The file that holds the fragmented MP4 headers every segment depends on.
pub const INIT_SEGMENT_URI: &str = "init.mp4";

const MICROSECONDS_PER_SECOND: u64 = 1_000_000;

/// The file name of the segment with the given index.
pub fn segment_uri(index: u32) -> String {
    format!("seg-{index}.m4s")
}

/// Renders a complete video-on-demand playlist, with segment URIs relative to the playlist.
pub fn render_hls_playlist(plan: &SegmentPlan) -> String {
    let header = [
        "#EXTM3U".to_owned(),
        "#EXT-X-VERSION:7".to_owned(),
        format!("#EXT-X-TARGETDURATION:{}", target_duration_seconds(plan)),
        "#EXT-X-PLAYLIST-TYPE:VOD".to_owned(),
        "#EXT-X-INDEPENDENT-SEGMENTS".to_owned(),
        format!("#EXT-X-MAP:URI=\"{INIT_SEGMENT_URI}\""),
    ];
    let entries =
        plan.segments
            .iter()
            .zip(segment_durations_us(plan))
            .map(|(segment, duration_us)| {
                format!(
                    "#EXTINF:{},\n{}",
                    format_seconds(duration_us),
                    segment_uri(segment.index)
                )
            });
    let lines: Vec<String> = header
        .into_iter()
        .chain(entries)
        .chain(once("#EXT-X-ENDLIST".to_owned()))
        .collect();
    lines.join("\n") + "\n"
}

/// Returns the longest segment duration rounded up to whole seconds, as HLS requires.
fn target_duration_seconds(plan: &SegmentPlan) -> u128 {
    plan.segments
        .iter()
        .map(|segment| {
            plan.timeline
                .timebase
                .ticks_to_seconds_ceil(segment.duration_ticks)
        })
        .max()
        .unwrap_or(0)
}

/// Rounds each segment boundary to the microsecond and takes the differences,
/// so the listed durations add up to the rounded end time without accumulated error.
fn segment_durations_us(plan: &SegmentPlan) -> Vec<u64> {
    let starts = plan.segments.iter().map(|segment| segment.start_pts);
    let boundaries: Vec<i128> = starts
        .chain(once(plan.timeline.end_pts()))
        .map(|pts| {
            let offset = pts - plan.timeline.start_pts;
            plan.timeline
                .timebase
                .ticks_to_units(offset, MICROSECONDS_PER_SECOND)
        })
        .collect();
    boundaries
        .windows(2)
        .map(|pair| u64::try_from(pair[1] - pair[0]).unwrap_or(0))
        .collect()
}

fn format_seconds(microseconds: u64) -> String {
    let seconds = microseconds / MICROSECONDS_PER_SECOND;
    format!("{seconds}.{:06}", microseconds % MICROSECONDS_PER_SECOND)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::media_timeline::{KeyframeIndex, MediaTimeline, Timebase};

    fn plan(denominator: u64, duration_ticks: u64, keyframe_pts: &[i64]) -> SegmentPlan {
        SegmentPlan::from_keyframes(&KeyframeIndex {
            timeline: MediaTimeline {
                timebase: Timebase::new(1, denominator).expect("nonzero timebase"),
                start_pts: 0,
                duration_ticks,
            },
            keyframe_pts: keyframe_pts.to_vec(),
        })
    }

    fn extinf_lines(playlist: &str) -> Vec<&str> {
        playlist
            .lines()
            .filter(|line| line.starts_with("#EXTINF"))
            .collect()
    }

    #[test]
    fn keeps_the_sum_of_durations_exact_for_thirds_of_a_second() {
        let playlist = render_hls_playlist(&plan(3, 3, &[0, 1, 2]));
        assert_eq!(
            extinf_lines(&playlist),
            [
                "#EXTINF:0.333333,",
                "#EXTINF:0.333334,",
                "#EXTINF:0.333333,"
            ]
        );
    }

    #[test]
    fn rounds_the_target_duration_up() {
        assert_eq!(target_duration_seconds(&plan(1000, 6001, &[0, 4001])), 5);
    }

    #[test]
    fn renders_a_small_playlist() {
        let expected = "#EXTM3U\n\
            #EXT-X-VERSION:7\n\
            #EXT-X-TARGETDURATION:4\n\
            #EXT-X-PLAYLIST-TYPE:VOD\n\
            #EXT-X-INDEPENDENT-SEGMENTS\n\
            #EXT-X-MAP:URI=\"init.mp4\"\n\
            #EXTINF:1.502000,\n\
            seg-0.m4s\n\
            #EXTINF:3.420000,\n\
            seg-1.m4s\n\
            #EXT-X-ENDLIST\n";
        assert_eq!(render_hls_playlist(&plan(1000, 4922, &[0, 1502])), expected);
    }
}
