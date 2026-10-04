use std::time::SystemTime;

use easyimmerse_conversion::ConversionError;
use easyimmerse_media::AudioAction;

use crate::support::{
    MKV, TONE_MP3, audio_only_plan, copy_plan, fetch_segments, ffmpeg_available, open_service,
    register,
};

#[tokio::test(flavor = "multi_thread")]
async fn plans_five_segments_for_the_matroska_fixture() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    let playlist = test.service.playlist(&key).await.expect("playlist");
    assert_eq!(playlist.matches("#EXTINF:").count(), 5);
}

#[tokio::test(flavor = "multi_thread")]
async fn produces_every_segment_from_the_start() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    let paths = fetch_segments(&test.service, &key, 0..5).await;
    assert!(paths.iter().all(|path| path.is_file()));
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_the_init_segment_before_any_media_segment() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    let init = test.service.init_segment(&key).await.expect("init");
    assert!(init.is_file());
}

#[tokio::test(flavor = "multi_thread")]
async fn a_request_for_an_interior_segment_starts_one_segment_earlier_and_discards_it() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    fetch_segments(&test.service, &key, [3, 4]).await;
    let entry_dir = test.cache_dir.path().join("conversions").join(key.as_str());
    let present = (0..5).map(|index| entry_dir.join(format!("s{index:05}.m4s")).is_file());
    assert_eq!(
        present.collect::<Vec<_>>(),
        [false, false, false, true, true]
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn never_overwrites_a_cached_segment() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    let first = fetch_segments(&test.service, &key, [3]).await.remove(0);
    let modified_before = modified(&first);
    tokio::time::sleep(std::time::Duration::from_millis(20)).await;
    fetch_segments(&test.service, &key, 0..5).await;
    assert_eq!(modified(&first), modified_before);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_segment_index_beyond_the_plan() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    assert!(matches!(
        test.service.segment(&key, 5).await,
        Err(ConversionError::UnknownSegment { index: 5, .. })
    ));
}

#[tokio::test(flavor = "multi_thread")]
async fn reuses_the_key_of_a_registered_conversion() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (first, _) = register(&test.service, MKV, copy_plan()).await;
    let (second, _) = register(&test.service, MKV, copy_plan()).await;
    assert_eq!(first, second);
}

#[tokio::test(flavor = "multi_thread")]
async fn cuts_an_audio_only_source_into_nominal_segments() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let plan = audio_only_plan(AudioAction::Copy { index: 0 });
    let (key, _) = register(&test.service, TONE_MP3, plan).await;
    let paths = fetch_segments(&test.service, &key, 0..2).await;
    assert!(paths.iter().all(|path| path.is_file()));
}

#[tokio::test(flavor = "multi_thread")]
async fn stops_its_processes_on_shutdown() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    fetch_segments(&test.service, &key, [0]).await;
    test.service.shutdown().await;
    assert!(test.service.diagnostics(&key).await.is_ok());
}

fn modified(path: &std::path::Path) -> SystemTime {
    std::fs::metadata(path)
        .and_then(|metadata| metadata.modified())
        .expect("modified")
}
