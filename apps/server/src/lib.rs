//! The command layer of the easyImmerse server: the command line, the config file, and the
//! `serve`, `users` and `config` commands. The standalone binary and the desktop app both run it.

pub mod cli;
pub mod config_command;
pub mod config_file;
pub mod serve_command;
pub mod serve_settings;
pub mod users_command;

use crate::cli::Command;

/// Runs one command of the command line.
pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::Serve(args) => serve_command::run(args).await,
        Command::Users(command) => users_command::run(command),
        Command::Config(command) => config_command::run(command),
    }
}
