use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use std::process::{Command, ExitStatus, Stdio};
use std::sync::mpsc;
use std::time::Instant;

use easyimmerse_plugin_api::base::easyimmerse::plugin::run_command::{CommandOutput, Host};
use easyimmerse_plugin_api::base::easyimmerse::plugin::types::PluginError;

use crate::host_state::{HostEvent, HostState};
use crate::imports::to_guest_error;

impl Host for HostState {
    fn run(
        &mut self,
        command: String,
        args: Vec<String>,
    ) -> wasmtime::Result<Result<CommandOutput, PluginError>> {
        let executable = match self.grants.resolve_bundled_command(&command) {
            Ok(executable) => executable,
            Err(error) => return Ok(Err(to_guest_error(error))),
        };
        tracing::debug!(target: "plugin", command, ?args, executable = %executable.display(), "running a command");
        self.emit(HostEvent::CommandStarted {
            command: command.clone(),
            args: args.clone(),
        });
        let started = Instant::now();
        let outcome = run_executable(&executable, &args, |line| {
            tracing::debug!(target: "plugin", command, "{line}");
            self.emit(HostEvent::CommandOutput {
                command: command.clone(),
                line: line.to_string(),
            });
        });
        let elapsed_ms = started.elapsed().as_millis() as u64;
        match outcome {
            Ok(output) => {
                report_finished(&command, &output, elapsed_ms);
                self.emit(HostEvent::CommandFinished {
                    command,
                    exit_code: output.exit_code,
                    elapsed_ms,
                });
                Ok(Ok(output))
            }
            Err(error) => {
                tracing::warn!(target: "plugin", command, "the command could not run: {error}");
                Ok(Err(PluginError::Io(format!("{command}: {error}"))))
            }
        }
    }
}

/// A failed command is worth a warning with the end of what it wrote to standard error,
/// since that is usually the tool's own explanation.
fn report_finished(command: &str, output: &CommandOutput, elapsed_ms: u64) {
    if output.exit_code == 0 {
        tracing::debug!(target: "plugin", command, elapsed_ms, "the command finished");
    } else {
        let stderr_tail: Vec<&str> = output.stderr.lines().rev().take(5).collect();
        tracing::warn!(
            target: "plugin",
            command,
            exit_code = output.exit_code,
            elapsed_ms,
            "the command failed; its last lines of standard error: {:?}",
            stderr_tail.into_iter().rev().collect::<Vec<_>>()
        );
    }
}

/// Runs the executable to completion, handing each line it writes to `on_line` as it
/// arrives, and returns everything it wrote. The lines of both streams arrive in the
/// order they were read, which is close to the order they were written.
fn run_executable(
    executable: &Path,
    args: &[String],
    mut on_line: impl FnMut(&str),
) -> std::io::Result<CommandOutput> {
    let mut child = build_command(executable)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;
    let (sender, receiver) = mpsc::channel();
    let stdout_reader = child
        .stdout
        .take()
        .map(|stream| read_lines(stream, Stream::Stdout, sender.clone()));
    let stderr_reader = child
        .stderr
        .take()
        .map(|stream| read_lines(stream, Stream::Stderr, sender));
    let (mut stdout, mut stderr) = (String::new(), String::new());
    for (stream, line) in receiver {
        on_line(&line);
        let text = match stream {
            Stream::Stdout => &mut stdout,
            Stream::Stderr => &mut stderr,
        };
        text.push_str(&line);
        text.push('\n');
    }
    let status = child.wait()?;
    for reader in [stdout_reader, stderr_reader].into_iter().flatten() {
        let _ = reader.join();
    }
    Ok(CommandOutput {
        exit_code: exit_code(status),
        stdout,
        stderr,
    })
}

#[derive(Debug, Clone, Copy)]
enum Stream {
    Stdout,
    Stderr,
}

/// Reads the stream line by line on its own thread, so that neither stream can fill its
/// pipe and block the command while the other is being read.
fn read_lines(
    stream: impl Read + Send + 'static,
    kind: Stream,
    sender: mpsc::Sender<(Stream, String)>,
) -> std::thread::JoinHandle<()> {
    std::thread::spawn(move || {
        let mut reader = BufReader::new(stream);
        let mut bytes = Vec::new();
        while let Ok(count) = reader.read_until(b'\n', &mut bytes) {
            if count == 0 {
                break;
            }
            let line = String::from_utf8_lossy(&bytes)
                .trim_end_matches(['\n', '\r'])
                .to_string();
            bytes.clear();
            if sender.send((kind, line)).is_err() {
                break;
            }
        }
    })
}

fn exit_code(status: ExitStatus) -> i32 {
    status.code().unwrap_or(-1)
}

/// Runs shell scripts through `sh`, so that the bundled file needs no execute permission on Unix.
/// Batch files are handed to the standard library directly:
/// it starts them through `cmd.exe` itself and escapes each argument for that interpreter,
/// refusing arguments it cannot escape safely.
fn build_command(executable: &Path) -> Command {
    let extension = executable.extension().and_then(|ext| ext.to_str());
    match extension {
        Some("sh") => script_command("sh", executable),
        _ => Command::new(executable),
    }
}

fn script_command(interpreter: &str, script: &Path) -> Command {
    let mut command = Command::new(interpreter);
    command.arg(script);
    command
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;

    fn script(dir: &Path, body: &str) -> std::path::PathBuf {
        let path = dir.join("tool.sh");
        std::fs::write(&path, format!("#!/bin/sh\n{body}\n")).unwrap();
        path
    }

    #[test]
    fn collects_standard_output_and_error_separately() {
        let dir = tempfile::tempdir().unwrap();
        let tool = script(dir.path(), "echo out; echo err >&2");
        let output = run_executable(&tool, &[], |_| {}).unwrap();
        assert_eq!(
            (output.stdout.as_str(), output.stderr.as_str()),
            ("out\n", "err\n")
        );
    }

    #[test]
    fn hands_each_line_over_as_it_arrives() {
        let dir = tempfile::tempdir().unwrap();
        let tool = script(dir.path(), "echo one; echo two >&2; echo three");
        let mut lines = Vec::new();
        run_executable(&tool, &[], |line| lines.push(line.to_string())).unwrap();
        lines.sort();
        assert_eq!(lines, vec!["one", "three", "two"]);
    }

    #[test]
    fn reports_the_exit_code() {
        let dir = tempfile::tempdir().unwrap();
        let tool = script(dir.path(), "exit 3");
        assert_eq!(run_executable(&tool, &[], |_| {}).unwrap().exit_code, 3);
    }

    #[test]
    fn passes_the_arguments_through() {
        let dir = tempfile::tempdir().unwrap();
        let tool = script(dir.path(), "echo \"$2\"");
        let args = ["a".to_string(), "b c".to_string()];
        assert_eq!(
            run_executable(&tool, &args, |_| {}).unwrap().stdout,
            "b c\n"
        );
    }
}
