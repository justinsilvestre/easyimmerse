//! The one way this application starts ffmpeg and ffprobe.

use std::path::Path;
use std::process::{Command, Stdio};

/// The `CREATE_NO_WINDOW` process creation flag of the Windows API.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// A command for a located ffmpeg or ffprobe binary that reads no input. On Windows it opens
/// no console window, which a child of the desktop app, a GUI process, would otherwise get.
pub fn background_command(binary: &Path) -> Command {
    let mut command = Command::new(binary);
    command.stdin(Stdio::null());
    #[cfg(windows)]
    std::os::windows::process::CommandExt::creation_flags(&mut command, CREATE_NO_WINDOW);
    command
}
