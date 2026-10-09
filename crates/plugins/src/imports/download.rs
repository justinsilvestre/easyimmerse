//! The `http.download` import: streams a response body into a granted file
//! without bounding its size, while keeping the device's storage safe.

use std::fs::{File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc::{Receiver, RecvTimeoutError, sync_channel};
use std::time::Duration;

use easyimmerse_plugin_api::base::easyimmerse::plugin::types::PluginError;

use crate::grants::CapabilityGrants;
use crate::host_state::DownloadLimits;
use crate::imports::http::{agent, check_host, check_status, to_io_error};
use crate::imports::to_guest_error;

const CHUNK_BYTES: usize = 64 * 1024;
static TEMP_COUNTER: AtomicU64 = AtomicU64::new(0);

type Chunk = std::io::Result<Vec<u8>>;

/// Checks the URL and the path before sending the request, so a refused
/// download touches neither the network nor the file system. The body goes to
/// a temporary file beside the destination, which replaces the destination
/// only once the transfer is complete.
pub fn download(
    grants: &CapabilityGrants,
    limits: DownloadLimits,
    url: &str,
    path: &str,
) -> Result<u64, PluginError> {
    check_host(grants, url)?;
    let destination = grants.resolve_granted_path(path).map_err(to_guest_error)?;
    let response = agent(Some(limits.stall_timeout))
        .get(url)
        .call()
        .map_err(|error| request_error(error, limits.stall_timeout))?;
    check_status(url, response.status().as_u16())?;
    let announced_bytes = response.body().content_length();
    check_space_before(&destination, announced_bytes, limits)?;
    let body = response.into_body().into_reader();
    let temp = temp_path_beside(&destination);
    let written = stream_to_file(body, &temp, limits);
    let result = written.and_then(|bytes| rename_into_place(&temp, &destination, bytes));
    if result.is_err() {
        let _ = std::fs::remove_file(&temp);
    }
    result
}

fn request_error(error: ureq::Error, stall_timeout: Duration) -> PluginError {
    match error {
        ureq::Error::Timeout(_) => stalled(stall_timeout),
        other => to_io_error(other),
    }
}

fn stalled(stall_timeout: Duration) -> PluginError {
    PluginError::Io(format!(
        "The download stalled: no data arrived for {} seconds.",
        stall_timeout.as_secs()
    ))
}

fn rename_into_place(temp: &Path, destination: &Path, bytes: u64) -> Result<u64, PluginError> {
    std::fs::rename(temp, destination).map_err(to_io_error)?;
    Ok(bytes)
}

/// Refuses a download whose announced size would leave less than the reserve.
/// The announced size is only a hint, so the transfer checks again.
fn check_space_before(
    destination: &Path,
    announced_bytes: Option<u64>,
    limits: DownloadLimits,
) -> Result<(), PluginError> {
    let available = available_space(destination, limits)?;
    let needed = announced_bytes
        .unwrap_or(0)
        .saturating_add(limits.reserve_bytes);
    if available < needed {
        return Err(not_enough_space(available, needed));
    }
    Ok(())
}

fn available_space(destination: &Path, limits: DownloadLimits) -> Result<u64, PluginError> {
    let directory = destination.parent().unwrap_or(destination);
    (limits.free_space)(directory).map_err(to_io_error)
}

fn not_enough_space(available: u64, needed: u64) -> PluginError {
    PluginError::Io(format!(
        "There is not enough free space on the device for this download: {} MB are free, and {} MB must stay free to keep the device usable.",
        available / 1_000_000,
        needed.div_ceil(1_000_000)
    ))
}

fn temp_path_beside(destination: &Path) -> PathBuf {
    let name = destination
        .file_name()
        .unwrap_or_default()
        .to_string_lossy();
    let unique = TEMP_COUNTER.fetch_add(1, Ordering::Relaxed);
    destination.with_file_name(format!(".{name}.{}-{unique}.download", std::process::id()))
}

/// Writes the body into a new file at `temp`, giving up when no bytes arrive
/// within the stall timeout or the free space falls below the reserve.
fn stream_to_file(
    body: impl Read + Send + 'static,
    temp: &Path,
    limits: DownloadLimits,
) -> Result<u64, PluginError> {
    let mut file = create_new(temp)?;
    let chunks = read_in_background(body);
    let (mut written, mut last_checked) = (0u64, 0u64);
    loop {
        let chunk = next_chunk(&chunks, limits.stall_timeout)?;
        if chunk.is_empty() {
            return Ok(written);
        }
        file.write_all(&chunk).map_err(to_io_error)?;
        written += chunk.len() as u64;
        if written - last_checked >= limits.space_check_interval_bytes {
            last_checked = written;
            check_space_while(temp, limits)?;
        }
    }
}

fn create_new(path: &Path) -> Result<File, PluginError> {
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(to_io_error)
}

/// Reads the body on another thread, because a blocked read cannot be
/// interrupted. An empty chunk marks the end of the body. The thread ends once
/// the receiver is dropped or the body is read to its end.
fn read_in_background(mut body: impl Read + Send + 'static) -> Receiver<Chunk> {
    let (sender, receiver) = sync_channel(4);
    std::thread::spawn(move || {
        loop {
            let mut buffer = vec![0; CHUNK_BYTES];
            let chunk = body.read(&mut buffer).map(|count| {
                buffer.truncate(count);
                buffer
            });
            let finished = chunk.as_ref().map_or(true, Vec::is_empty);
            if sender.send(chunk).is_err() || finished {
                return;
            }
        }
    });
    receiver
}

fn next_chunk(chunks: &Receiver<Chunk>, stall_timeout: Duration) -> Result<Vec<u8>, PluginError> {
    match chunks.recv_timeout(stall_timeout) {
        Ok(chunk) => chunk.map_err(to_io_error),
        Err(RecvTimeoutError::Timeout) => Err(stalled(stall_timeout)),
        Err(RecvTimeoutError::Disconnected) => Err(to_io_error("the download was interrupted")),
    }
}

/// Aborts once the bytes written so far have used up the reserve.
fn check_space_while(temp: &Path, limits: DownloadLimits) -> Result<(), PluginError> {
    let available = available_space(temp, limits)?;
    if available < limits.reserve_bytes {
        return Err(not_enough_space(available, limits.reserve_bytes));
    }
    Ok(())
}
