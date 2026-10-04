//! Compares converted output with the source frame by frame and click by click. Presentation
//! times are read from the fragment boxes, the way a browser's media source computes them.

use std::path::{Path, PathBuf};

use easyimmerse_conversion::{ConversionKey, ConversionService};

use crate::support::{
    MKV, MPEG4_VORBIS, click_positions, concatenate, copy_plan, decode_audio, decode_frame_indexes,
    fetch_segments, ffmpeg_available, hardware_encoder, open_service, register, transcode_plan,
    video_presentation_times,
};

const MKV_FRAME_RATE: f64 = 24.0;
const MPEG4_FRAME_RATE: f64 = 25.0;
const SAMPLE_RATE: usize = 48_000;
/// Matroska stores whole milliseconds, so a 24 fps frame may present up to half a millisecond
/// off; anything within two milliseconds is far below what a viewer can notice.
const FRAME_TIME_TOLERANCE: f64 = 0.002;
/// Clicks may drift by this many samples (two milliseconds) before a seam is audible.
const CLICK_TOLERANCE: i64 = 96;

struct Converted {
    frames: Vec<usize>,
    presentation_times: Vec<f64>,
}

async fn convert(
    service: &ConversionService,
    key: &ConversionKey,
    indexes: impl IntoIterator<Item = usize>,
    dir: &Path,
) -> (Converted, PathBuf) {
    let segments = fetch_segments(service, key, indexes).await;
    let init = service.init_segment(key).await.expect("init");
    let file = dir.join("converted.mp4");
    concatenate(&init, &segments, &file);
    let mut presentation_times = video_presentation_times(&init, &segments);
    presentation_times.sort_by(f64::total_cmp);
    let converted = Converted {
        frames: decode_frame_indexes(&file),
        presentation_times,
    };
    (converted, file)
}

/// Every decoded frame, in presentation order, must show the index of the source frame at its
/// presentation time. Returns the frames that do not, as (time, shown index, expected index).
fn mismatches(converted: &Converted, frame_rate: f64) -> Vec<(f64, usize, f64)> {
    converted
        .presentation_times
        .iter()
        .zip(&converted.frames)
        .map(|(&time, &shown)| (time, shown, time * frame_rate))
        .filter(|(_, shown, expected)| {
            (*shown as f64 - expected).abs() > FRAME_TIME_TOLERANCE * frame_rate
        })
        .collect()
}

#[tokio::test(flavor = "multi_thread")]
async fn copied_frames_from_the_start_present_at_their_source_times() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    let (converted, _) = convert(&test.service, &key, 0..5, test.cache_dir.path()).await;
    assert_eq!(
        (
            converted.frames.len(),
            mismatches(&converted, MKV_FRAME_RATE)
        ),
        (240, vec![])
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn copied_frames_from_an_interior_segment_present_at_their_source_times() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    let (converted, _) = convert(&test.service, &key, [3, 4], test.cache_dir.path()).await;
    assert_eq!(
        (
            converted.frames.first(),
            mismatches(&converted, MKV_FRAME_RATE)
        ),
        (Some(&144), vec![])
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn audio_seconds_line_up_across_a_restart_seam() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    fetch_segments(&test.service, &key, [3]).await;
    let (_, file) = convert(&test.service, &key, 0..5, test.cache_dir.path()).await;
    let clicks = click_positions(&decode_audio(&file));
    let offsets: Vec<i64> = clicks
        .iter()
        .enumerate()
        .map(|(second, &position)| position as i64 - (second * SAMPLE_RATE) as i64)
        .collect();
    let spread = offsets.iter().max().unwrap_or(&0) - offsets.iter().min().unwrap_or(&0);
    eprintln!("click offsets in samples: {offsets:?}");
    assert!(
        clicks.len() == 10 && spread <= CLICK_TOLERANCE,
        "clicks at {clicks:?}, offsets {offsets:?}"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn transcoded_frames_present_at_their_source_times() {
    if !ffmpeg_available() {
        return;
    }
    let Some(encoder) = hardware_encoder() else {
        return;
    };
    let test = open_service();
    let (key, _) = register(&test.service, MPEG4_VORBIS, transcode_plan(&encoder)).await;
    let (converted, _) = convert(&test.service, &key, 0..5, test.cache_dir.path()).await;
    assert_eq!(
        (
            converted.frames.len(),
            mismatches(&converted, MPEG4_FRAME_RATE)
        ),
        (250, vec![])
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn transcoded_frames_from_an_interior_segment_present_at_their_source_times() {
    if !ffmpeg_available() {
        return;
    }
    let Some(encoder) = hardware_encoder() else {
        return;
    };
    let test = open_service();
    let (key, _) = register(&test.service, MPEG4_VORBIS, transcode_plan(&encoder)).await;
    let (converted, _) = convert(&test.service, &key, [2, 3, 4], test.cache_dir.path()).await;
    assert_eq!(
        (
            converted.frames.first(),
            mismatches(&converted, MPEG4_FRAME_RATE)
        ),
        (Some(&100), vec![])
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn the_transcoded_init_segment_is_stable_across_runs() {
    if !ffmpeg_available() {
        return;
    }
    let Some(encoder) = hardware_encoder() else {
        return;
    };
    let mut inits = Vec::new();
    for _ in 0..2 {
        let test = open_service();
        let (key, _) = register(&test.service, MPEG4_VORBIS, transcode_plan(&encoder)).await;
        fetch_segments(&test.service, &key, [0]).await;
        let init = test.service.init_segment(&key).await.expect("init");
        inits.push(std::fs::read(init).expect("read"));
    }
    assert_eq!(inits[0], inits[1]);
}
