//! The `http.download` import, reached through the fixture plugin's `sandbox-probe` export.

use std::path::Path;

use easyimmerse_plugins::PluginErrorKind;

use crate::media_source::Fixture;

fn sample_url(fixture: &Fixture) -> String {
    format!("{}/sample.mp4", fixture.server.base_url)
}

fn download(fixture: &Fixture, url: &str, path: &str) -> Result<u64, PluginErrorKind> {
    fixture
        .probe()
        .probe_download(url, path)
        .expect("the call completes")
}

fn sample_len() -> u64 {
    std::fs::metadata(crate::support::fixtures_dir().join("sample.mp4"))
        .expect("read the sample's metadata")
        .len()
}

#[test]
fn writes_the_response_body_into_the_granted_dir() {
    let fixture = Fixture::start();
    let path = fixture.output_path("media.mp4");
    download(&fixture, &sample_url(&fixture), &path).expect("download");
    assert_eq!(
        std::fs::read(&path).expect("read the written file"),
        std::fs::read(crate::support::fixtures_dir().join("sample.mp4")).expect("read the sample")
    );
}

#[test]
fn returns_the_number_of_bytes_written() {
    let fixture = Fixture::start();
    let path = fixture.output_path("media.mp4");
    assert_eq!(
        download(&fixture, &sample_url(&fixture), &path),
        Ok(sample_len())
    );
}

#[test]
fn refuses_a_host_that_is_not_allowed() {
    let fixture = Fixture::start();
    let outcome = download(
        &fixture,
        "http://example.com/sample.mp4",
        &fixture.output_path("media.mp4"),
    );
    assert!(
        matches!(outcome, Err(PluginErrorKind::NotPermitted(_))),
        "got {outcome:?}"
    );
}

#[test]
fn refuses_a_path_outside_the_granted_dirs() {
    let fixture = Fixture::start();
    let other_dir = tempfile::tempdir().expect("create a temp dir");
    let path = other_dir.path().join("media.mp4");
    let outcome = download(&fixture, &sample_url(&fixture), &path.to_string_lossy());
    assert!(
        matches!(outcome, Err(PluginErrorKind::NotPermitted(_))),
        "got {outcome:?}"
    );
}

#[test]
fn writes_nothing_outside_the_granted_dirs() {
    let fixture = Fixture::start();
    let other_dir = tempfile::tempdir().expect("create a temp dir");
    let path = other_dir.path().join("media.mp4");
    let _ = download(&fixture, &sample_url(&fixture), &path.to_string_lossy());
    assert!(!path.exists());
}

#[test]
fn reports_a_missing_resource_as_not_found() {
    let fixture = Fixture::start();
    let url = format!("{}/missing.mp4", fixture.server.base_url);
    let outcome = download(&fixture, &url, &fixture.output_path("media.mp4"));
    assert!(
        matches!(outcome, Err(PluginErrorKind::NotFound(_))),
        "got {outcome:?}"
    );
}

#[test]
fn writes_no_file_for_a_missing_resource() {
    let fixture = Fixture::start();
    let url = format!("{}/missing.mp4", fixture.server.base_url);
    let path = fixture.output_path("media.mp4");
    let _ = download(&fixture, &url, &path);
    assert!(!Path::new(&path).exists());
}
