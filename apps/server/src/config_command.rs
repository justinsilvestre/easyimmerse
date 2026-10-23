//! The `config` subcommands, which show and change the settings in a config file.

use crate::cli::ConfigCommand;
use crate::config_file::ServerFileConfig;
use crate::config_set::set;
use crate::config_show::show;

pub use crate::config_set::{ConfigSetError, set_value};

pub fn run(command: ConfigCommand) -> anyhow::Result<()> {
    run_with_defaults(command, &ServerFileConfig::default())
}

/// Runs a `config` subcommand,
/// showing each setting that the config file leaves out as it is in `defaults`.
pub fn run_with_defaults(
    command: ConfigCommand,
    defaults: &ServerFileConfig,
) -> anyhow::Result<()> {
    match command {
        ConfigCommand::Show(args) => show(&args, defaults),
        ConfigCommand::Set(args) => set(&args),
    }
}
