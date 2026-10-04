use easyimmerse_conversion::ConversionError;
use easyimmerse_media::{TrackInfo, TrackKind};

use crate::support::{TONE_WAV, ffmpeg_available, fixture_path, open_service, probe};

async fn audio_track() -> TrackInfo {
    probe(&fixture_path(TONE_WAV))
        .await
        .tracks_of_kind(TrackKind::Audio)
        .next()
        .cloned()
        .expect("audio track")
}

#[tokio::test(flavor = "multi_thread")]
async fn yields_one_hundred_peaks_per_second() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let track = audio_track().await;
    let response = test
        .service
        .waveform(&fixture_path(TONE_WAV), &track, 0, 2000)
        .await
        .expect("waveform");
    assert_eq!(response.peaks.len(), 200);
}

#[tokio::test(flavor = "multi_thread")]
async fn shows_the_click_at_the_start_of_each_second() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let track = audio_track().await;
    let response = test
        .service
        .waveform(&fixture_path(TONE_WAV), &track, 1000, 3000)
        .await
        .expect("waveform");
    let (click, tone) = (response.peaks[0], response.peaks[50]);
    assert!(
        click > 200 && (50..80).contains(&tone),
        "click {click}, tone {tone}"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn echoes_the_window_start() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let track = audio_track().await;
    let response = test
        .service
        .waveform(&fixture_path(TONE_WAV), &track, 1000, 3000)
        .await
        .expect("waveform");
    assert_eq!(response.start_ms, 1000);
}

#[tokio::test(flavor = "multi_thread")]
async fn returns_fewer_peaks_past_the_end() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let track = audio_track().await;
    let response = test
        .service
        .waveform(&fixture_path(TONE_WAV), &track, 5000, 8000)
        .await
        .expect("waveform");
    assert!(
        (90..=101).contains(&response.peaks.len()),
        "{}",
        response.peaks.len()
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn rejects_an_inverted_window() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let track = audio_track().await;
    let result = test
        .service
        .waveform(&fixture_path(TONE_WAV), &track, 3000, 1000)
        .await;
    assert!(matches!(
        result,
        Err(ConversionError::InvalidWaveformWindow(_))
    ));
}
