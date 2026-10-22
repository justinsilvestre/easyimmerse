//! The command layer of the easyImmerse server:
//! the command line, the config file, and the `serve`, `users` and `config` commands.
//! The standalone binary and the desktop app both run it.

pub mod cli;
pub mod config_command;
pub mod config_file;
mod config_set;
mod config_show;
pub mod serve_command;
pub mod serve_settings;
pub mod users_command;

use crate::cli::Command;
use crate::config_file::ServerFileConfig;

/// Runs one command of the command line.
pub async fn run(command: Command) -> anyhow::Result<()> {
    run_with_defaults(command, &ServerFileConfig::default()).await
}

/// Runs one command of the command line,
/// taking each setting that neither the command line nor the config file gives from `defaults`,
/// as the desktop app does with its own locations.
pub async fn run_with_defaults(
    command: Command,
    defaults: &ServerFileConfig,
) -> anyhow::Result<()> {
    match command {
        Command::Serve(args) => serve_command::run_with_defaults(*args, defaults).await,
        Command::Users(command) => users_command::run(command),
        Command::Config(command) => config_command::run_with_defaults(command, defaults),
    }
}
