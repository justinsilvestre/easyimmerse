//! The `http.download` import, reached through the fixture plugin's `sandbox-probe` export.

use std::io::Read;
use std::path::Path;
use std::time::Duration;

use easyimmerse_plugins::{DownloadLimits, HostLimits, PluginErrorKind};
use tiny_http::{Response, StatusCode};

use crate::media_source::Fixture;
use crate::support::{LoopbackServer, start_http_server};

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

fn download_with_limits(
    fixture: &Fixture,
    limits: HostLimits,
    url: &str,
    path: &str,
) -> Result<u64, PluginErrorKind> {
    fixture
        .probe_with_limits(limits)
        .probe_download(url, path)
        .expect("the call completes")
}

fn io_message(outcome: Result<u64, PluginErrorKind>) -> String {
    match outcome {
        Err(PluginErrorKind::Io(message)) => message,
        other => panic!("expected an io error, got {other:?}"),
    }
}

fn file_names_in(fixture: &Fixture) -> Vec<String> {
    std::fs::read_dir(fixture.output_dir.path())
        .expect("list the output dir")
        .map(|entry| {
            entry
                .expect("read an entry")
                .file_name()
                .to_string_lossy()
                .into_owned()
        })
        .collect()
}

/// A server that answers every request with a body from `make_body`, sent without a length.
fn serve_streams(make_body: fn() -> Box<dyn Read + Send>) -> LoopbackServer {
    start_http_server(move |request| {
        let response = Response::new(StatusCode(200), vec![], make_body(), None, None);
        let _ = request.respond(response);
    })
}

/// Sends a little data, then goes quiet for longer than any test waits.
struct StallingBody(bool);

impl Read for StallingBody {
    fn read(&mut self, buffer: &mut [u8]) -> std::io::Result<usize> {
        if self.0 {
            std::thread::sleep(Duration::from_secs(5));
            return Ok(0);
        }
        self.0 = true;
        buffer[..16].fill(1);
        Ok(16)
    }
}

/// Sends a block every 100 milliseconds, eight times, so the whole body takes longer than
/// the stall timeout the tests set while no single wait does.
struct TricklingBody(u8);

impl Read for TricklingBody {
    fn read(&mut self, buffer: &mut [u8]) -> std::io::Result<usize> {
        if self.0 == 8 {
            return Ok(0);
        }
        self.0 += 1;
        std::thread::sleep(Duration::from_millis(100));
        let count = buffer.len().min(TRICKLE_BLOCK_BYTES);
        buffer[..count].fill(1);
        Ok(count)
    }
}

/// Large enough that the server sends each block as its own chunk.
const TRICKLE_BLOCK_BYTES: usize = 16_384;
const BODY_BYTES: u64 = 10_000;
const FREE_SPACE_BUDGET_BYTES: u64 = 100_000;

/// Reports a fixed amount, below the default reserve.
fn little_free_space(_directory: &Path) -> std::io::Result<u64> {
    Ok(1_000)
}

/// Reports a budget that shrinks tenfold faster than the files in the directory grow.
fn shrinking_free_space(directory: &Path) -> std::io::Result<u64> {
    let mut used = 0;
    for entry in std::fs::read_dir(directory)? {
        used += current_file_len(&entry?.path())?;
    }
    Ok(FREE_SPACE_BUDGET_BYTES.saturating_sub(used * 10))
}

/// Reads the length through an open handle, because on Windows the length in a directory
/// listing stays stale while another handle is still writing to the file.
fn current_file_len(path: &Path) -> std::io::Result<u64> {
    Ok(std::fs::File::open(path)?.metadata()?.len())
}

fn download_limits(download: DownloadLimits) -> HostLimits {
    HostLimits {
        download,
        ..HostLimits::default()
    }
}

fn shrinking_space_limits() -> HostLimits {
    download_limits(DownloadLimits {
        reserve_bytes: 80_000,
        space_check_interval_bytes: 4_096,
        free_space: shrinking_free_space,
        ..DownloadLimits::default()
    })
}

fn little_space_limits() -> HostLimits {
    download_limits(DownloadLimits {
        free_space: little_free_space,
        ..DownloadLimits::default()
    })
}

fn serve_small_body() -> LoopbackServer {
    serve_streams(|| Box::new(std::io::repeat(0).take(BODY_BYTES)))
}

#[test]
fn leaves_only_the_finished_file_in_the_dir() {
    let fixture = Fixture::start();
    download(
        &fixture,
        &sample_url(&fixture),
        &fixture.output_path("media.mp4"),
    )
    .expect("download");
    assert_eq!(file_names_in(&fixture), ["media.mp4"]);
}

#[test]
fn refuses_a_download_that_would_leave_less_than_the_reserve_free() {
    let fixture = Fixture::start();
    let limits = little_space_limits();
    let outcome = download_with_limits(
        &fixture,
        limits,
        &sample_url(&fixture),
        &fixture.output_path("media.mp4"),
    );
    assert!(io_message(outcome).contains("not enough free space"));
}

#[test]
fn leaves_no_file_behind_when_the_reserve_refuses_a_download() {
    let fixture = Fixture::start();
    let limits = little_space_limits();
    let _ = download_with_limits(
        &fixture,
        limits,
        &sample_url(&fixture),
        &fixture.output_path("media.mp4"),
    );
    assert!(file_names_in(&fixture).is_empty());
}

#[test]
fn stops_a_download_that_outgrows_the_reserve_while_streaming() {
    let fixture = Fixture::start();
    let server = serve_small_body();
    let limits = shrinking_space_limits();
    let outcome = download_with_limits(
        &fixture,
        limits,
        &server.base_url,
        &fixture.output_path("media.bin"),
    );
    assert!(io_message(outcome).contains("not enough free space"));
}

#[test]
fn removes_the_partial_file_when_the_reserve_stops_a_download() {
    let fixture = Fixture::start();
    let server = serve_small_body();
    let limits = shrinking_space_limits();
    let _ = download_with_limits(
        &fixture,
        limits,
        &server.base_url,
        &fixture.output_path("media.bin"),
    );
    assert!(file_names_in(&fixture).is_empty());
}

#[test]
fn aborts_a_download_that_receives_no_bytes_within_the_stall_timeout() {
    let fixture = Fixture::start();
    let server = serve_streams(|| Box::new(StallingBody(false)));
    let limits = download_limits(DownloadLimits {
        stall_timeout: Duration::from_millis(300),
        ..DownloadLimits::default()
    });
    let outcome = download_with_limits(
        &fixture,
        limits,
        &server.base_url,
        &fixture.output_path("media.bin"),
    );
    assert!(io_message(outcome).contains("stalled"));
}

#[test]
fn removes_the_partial_file_when_a_download_stalls() {
    let fixture = Fixture::start();
    let server = serve_streams(|| Box::new(StallingBody(false)));
    let limits = download_limits(DownloadLimits {
        stall_timeout: Duration::from_millis(300),
        ..DownloadLimits::default()
    });
    let _ = download_with_limits(
        &fixture,
        limits,
        &server.base_url,
        &fixture.output_path("media.bin"),
    );
    assert!(file_names_in(&fixture).is_empty());
}

#[test]
fn completes_a_download_that_outlasts_the_stall_timeout_while_bytes_keep_arriving() {
    let fixture = Fixture::start();
    let server = serve_streams(|| Box::new(TricklingBody(0)));
    let limits = download_limits(DownloadLimits {
        stall_timeout: Duration::from_millis(300),
        ..DownloadLimits::default()
    });
    let outcome = download_with_limits(
        &fixture,
        limits,
        &server.base_url,
        &fixture.output_path("media.bin"),
    );
    assert!(
        outcome.is_ok(),
        "expected the download to finish, got {outcome:?}"
    );
}
