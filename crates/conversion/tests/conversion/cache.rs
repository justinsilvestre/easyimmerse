use std::path::PathBuf;
use std::time::Duration;

use crate::support::{
    MKV, copy_plan, fetch_segments, ffmpeg_available, fixture_path, open_service, open_service_in,
    register,
};

fn entry_dirs(cache_dir: &std::path::Path) -> Vec<PathBuf> {
    std::fs::read_dir(cache_dir.join("conversions"))
        .map(|entries| entries.flatten().map(|entry| entry.path()).collect())
        .unwrap_or_default()
}

#[tokio::test(flavor = "multi_thread")]
async fn reports_the_usage_of_converted_segments() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    fetch_segments(&test.service, &key, 0..5).await;
    let status = test.service.cache_status().await.expect("status");
    assert!(status.usage_bytes > 50_000, "{status:?}");
}

#[tokio::test(flavor = "multi_thread")]
async fn reports_the_budget_within_its_bounds() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let status = test.service.cache_status().await.expect("status");
    let gib = 1024 * 1024 * 1024;
    assert!(
        (gib..=100 * gib).contains(&status.budget_bytes),
        "{status:?}"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn clearing_keeps_an_entry_in_use() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    fetch_segments(&test.service, &key, [0]).await;
    test.service.clear_cache().await.expect("clear");
    assert_eq!(entry_dirs(test.cache_dir.path()).len(), 1);
}

#[tokio::test(flavor = "multi_thread")]
async fn clearing_removes_an_entry_nobody_uses() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    fetch_segments(&test.service, &key, [0]).await;
    test.service.shutdown().await;
    let later = open_service_in(test.cache_dir.path());
    later.clear_cache().await.expect("clear");
    assert!(entry_dirs(test.cache_dir.path()).is_empty());
}

#[tokio::test(flavor = "multi_thread")]
async fn a_new_service_picks_up_an_entry_from_disk() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    fetch_segments(&test.service, &key, [0]).await;
    test.service.shutdown().await;
    let later = open_service_in(test.cache_dir.path());
    assert!(later.playlist(&key).await.is_ok());
}

#[tokio::test(flavor = "multi_thread")]
async fn removes_the_entries_of_a_deleted_source() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    fetch_segments(&test.service, &key, [0]).await;
    test.service
        .remove_entries_for_source(&fixture_path(MKV))
        .await
        .expect("remove");
    assert!(entry_dirs(test.cache_dir.path()).is_empty());
}

#[tokio::test(flavor = "multi_thread")]
async fn startup_cleanup_removes_entries_of_unreferenced_sources() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    fetch_segments(&test.service, &key, [0]).await;
    test.service.shutdown().await;
    let later = open_service_in(test.cache_dir.path());
    later.start_cache_cleanup(vec![]);
    wait_until(|| entry_dirs(test.cache_dir.path()).is_empty()).await;
    assert!(entry_dirs(test.cache_dir.path()).is_empty());
}

#[tokio::test(flavor = "multi_thread")]
async fn startup_cleanup_keeps_entries_of_referenced_sources_and_removes_run_directories() {
    if !ffmpeg_available() {
        return;
    }
    let test = open_service();
    let (key, _) = register(&test.service, MKV, copy_plan()).await;
    fetch_segments(&test.service, &key, [0]).await;
    test.service.shutdown().await;
    let entry_dir = test.cache_dir.path().join("conversions").join(key.as_str());
    std::fs::create_dir_all(entry_dir.join("run")).expect("run dir");
    let later = open_service_in(test.cache_dir.path());
    later.start_cache_cleanup(vec![fixture_path(MKV)]);
    wait_until(|| !entry_dir.join("run").exists()).await;
    assert!(entry_dir.join("manifest.json").is_file() && !entry_dir.join("run").exists());
}

async fn wait_until(condition: impl Fn() -> bool) {
    for _ in 0..100 {
        if condition() {
            return;
        }
        tokio::time::sleep(Duration::from_millis(50)).await;
    }
}
