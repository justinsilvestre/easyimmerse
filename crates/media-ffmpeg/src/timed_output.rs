//! Running a child process with a time limit.

use std::process::{Command, Output, Stdio};
use std::time::{Duration, Instant};

const POLL_INTERVAL: Duration = Duration::from_millis(20);

/// Runs the command with standard output discarded and returns its output, or `None` once it
/// has run for `limit` and been killed. Standard error is read only after the process exits, so
/// a process that writes more than the pipe holds runs into the limit.
pub(crate) fn output_within(
    command: &mut Command,
    limit: Duration,
) -> std::io::Result<Option<Output>> {
    let mut child = command
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()?;
    let deadline = Instant::now() + limit;
    while child.try_wait()?.is_none() {
        if Instant::now() >= deadline {
            child.kill()?;
            child.wait()?;
            return Ok(None);
        }
        std::thread::sleep(POLL_INTERVAL);
    }
    child.wait_with_output().map(Some)
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;

    #[test]
    fn returns_the_output_of_a_process_that_finishes_in_time() {
        let mut command = Command::new("sh");
        command.args(["-c", "echo failed >&2"]);
        let output = output_within(&mut command, Duration::from_secs(10)).expect("run");
        assert_eq!(
            output.map(|output| output.stderr),
            Some(b"failed\n".to_vec())
        );
    }

    #[test]
    fn kills_a_process_that_runs_past_the_limit() {
        let mut command = Command::new("sleep");
        command.arg("30");
        let output = output_within(&mut command, Duration::from_millis(50)).expect("run");
        assert!(output.is_none());
    }
}
