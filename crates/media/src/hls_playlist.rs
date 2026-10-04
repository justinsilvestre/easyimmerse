//! Rendering of the on-demand HLS playlist for a segment plan.

use std::fmt::Write;

use crate::segment_plan::SegmentPlan;

const MICROS_PER_SECOND: i64 = 1_000_000;

/// Renders a version 7 VOD playlist. Segment durations are differences of the cumulative starts
/// rounded to microseconds, so that their sum matches the rounded total exactly.
pub fn render_vod_playlist(
    plan: &SegmentPlan,
    init_uri: &str,
    segment_uri: impl Fn(usize) -> String,
) -> String {
    let durations = segment_durations_micros(plan);
    let longest = durations.iter().copied().max().unwrap_or(0);
    let mut playlist = String::new();
    playlist.push_str("#EXTM3U\n#EXT-X-VERSION:7\n");
    let _ = writeln!(
        playlist,
        "#EXT-X-TARGETDURATION:{}",
        (longest + MICROS_PER_SECOND - 1) / MICROS_PER_SECOND
    );
    playlist.push_str("#EXT-X-PLAYLIST-TYPE:VOD\n#EXT-X-INDEPENDENT-SEGMENTS\n");
    let _ = writeln!(playlist, "#EXT-X-MAP:URI=\"{init_uri}\"");
    for (index, duration) in durations.into_iter().enumerate() {
        let _ = writeln!(
            playlist,
            "#EXTINF:{}.{:06},\n{}",
            duration / MICROS_PER_SECOND,
            duration % MICROS_PER_SECOND,
            segment_uri(index)
        );
    }
    playlist.push_str("#EXT-X-ENDLIST\n");
    playlist
}

/// Player time is presentation time minus the source start time.
fn segment_durations_micros(plan: &SegmentPlan) -> Vec<i64> {
    let player_micros = |ticks: i64| plan.timebase.ticks_to_micros(ticks - plan.start_ticks);
    plan.segments
        .iter()
        .map(|segment| player_micros(segment.end_ticks) - player_micros(segment.start_ticks))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rational::Rational;
    use crate::segment_plan::plan_segments;
    use crate::source_timing::SourceTiming;

    fn plan() -> SegmentPlan {
        plan_segments(&SourceTiming {
            timebase: Rational::new(1, 12288),
            start_ticks: 0,
            duration_ticks: 12288 * 5,
            keyframe_ticks: vec![0, 25_601, 51_200],
        })
    }

    fn render(plan: &SegmentPlan) -> String {
        render_vod_playlist(plan, "init.mp4", |index| format!("s{index:05}.m4s"))
    }

    #[test]
    fn renders_the_playlist_exactly() {
        assert_eq!(
            render(&plan()),
            "#EXTM3U\n\
             #EXT-X-VERSION:7\n\
             #EXT-X-TARGETDURATION:3\n\
             #EXT-X-PLAYLIST-TYPE:VOD\n\
             #EXT-X-INDEPENDENT-SEGMENTS\n\
             #EXT-X-MAP:URI=\"init.mp4\"\n\
             #EXTINF:2.083415,\n\
             s00000.m4s\n\
             #EXTINF:2.083252,\n\
             s00001.m4s\n\
             #EXTINF:0.833333,\n\
             s00002.m4s\n\
             #EXT-X-ENDLIST\n"
        );
    }

    #[test]
    fn measures_segments_from_the_source_start_time() {
        let plan = plan_segments(&SourceTiming {
            timebase: Rational::new(1, 90_000),
            start_ticks: 133_200,
            duration_ticks: 90_000 * 3,
            keyframe_ticks: vec![133_200, 133_200 + 180_000],
        });
        assert!(render(&plan).contains("#EXTINF:2.000000,\ns00000.m4s\n#EXTINF:1.000000,"));
    }

    #[test]
    fn makes_the_rounded_durations_sum_to_the_rounded_total() {
        let plan = plan_segments(&SourceTiming {
            timebase: Rational::new(1, 3),
            start_ticks: 0,
            duration_ticks: 3,
            keyframe_ticks: vec![0, 1, 2],
        });
        let total: i64 = segment_durations_micros(&plan).iter().sum();
        assert_eq!(total, 1_000_000);
    }
}
