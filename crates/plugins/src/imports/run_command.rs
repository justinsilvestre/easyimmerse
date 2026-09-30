use std::path::Path;
use std::process::{Command, Output};

use easyimmerse_plugin_api::base::easyimmerse::plugin::run_command::{CommandOutput, Host};
use easyimmerse_plugin_api::base::easyimmerse::plugin::types::PluginError;

use crate::host_state::HostState;
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
        Ok(run_executable(&executable, &args)
            .map(to_command_output)
            .map_err(|error| PluginError::Io(error.to_string())))
    }
}

fn run_executable(executable: &Path, args: &[String]) -> std::io::Result<Output> {
    build_command(executable).args(args).output()
}

/// Runs scripts through their interpreter, so that the bundled file needs no
/// execute permission on Unix and `.cmd` files run on Windows.
fn build_command(executable: &Path) -> Command {
    let extension = executable.extension().and_then(|ext| ext.to_str());
    match extension {
        Some("sh") => script_command("sh", &[], executable),
        Some("cmd" | "bat") => script_command("cmd", &["/C"], executable),
        _ => Command::new(executable),
    }
}

fn script_command(interpreter: &str, flags: &[&str], script: &Path) -> Command {
    let mut command = Command::new(interpreter);
    command.args(flags).arg(script);
    command
}

fn to_command_output(output: Output) -> CommandOutput {
    CommandOutput {
        exit_code: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    }
}
