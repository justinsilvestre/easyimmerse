//! Runs the server's `serve`, `users` and `config` commands instead of the window when the app is started with one of them,
//! using the app's config file, database and directories wherever the command line names none.
//! `serve` then runs the app's server without a window, listening only on the configured address.

use std::ffi::OsString;

use anyhow::Context as _;
use clap::{CommandFactory, FromArgMatches};
use easyimmerse_server::cli::{Cli, Command, ConfigCommand, ServeArgs};
use easyimmerse_server::config_file::ServerFileConfig;
use easyimmerse_server::serve_command::load_file_config;
use easyimmerse_server::serve_settings::resolve_serve_settings;

use crate::app_locations;
use crate::server_addresses::{expected_hosts, host_name, lan_ipv4_addresses};
use crate::server_settings::AppLocations;

const SUBCOMMANDS: [&str; 3] = ["serve", "users", "config"];
const BINARY_NAME: &str = "easyimmerse-native";

/// Runs the command the app was started with, if any, and returns the exit status.
pub fn run_if_requested(context: &tauri::Context<tauri::Wry>) -> Option<i32> {
    let args: Vec<OsString> = std::env::args_os().collect();
    let first = args.get(1).and_then(|arg| arg.to_str());
    if !first.is_some_and(|arg| SUBCOMMANDS.contains(&arg)) {
        return None;
    }
    match run(args, context) {
        Ok(()) => Some(0),
        Err(error) => {
            eprintln!("error: {error:#}");
            Some(1)
        }
    }
}

fn run(args: Vec<OsString>, context: &tauri::Context<tauri::Wry>) -> anyhow::Result<()> {
    let locations =
        app_locations::from_context(context).context("could not find the app's directories")?;
    let matches = Cli::command()
        .name(BINARY_NAME)
        .bin_name(BINARY_NAME)
        .get_matches_from(args);
    let command = with_app_defaults(Cli::from_arg_matches(&matches)?.command, &locations)?;
    let runtime = tokio::runtime::Runtime::new().context("could not start the async runtime")?;
    runtime.block_on(easyimmerse_server::run_with_defaults(
        command,
        &locations.defaults(),
    ))
}

/// Names the app's config file and database where the command line names none.
fn with_app_defaults(command: Command, locations: &AppLocations) -> anyhow::Result<Command> {
    let config_path = locations.config_path();
    Ok(match command {
        Command::Serve(mut args) => {
            if args.config.is_none() && config_path.exists() {
                args.config = Some(config_path);
            }
            if args.db.is_none() {
                args.db = locations.database_override.clone();
            }
            if args.expected_hosts.is_empty() {
                args.expected_hosts = hosts_of_this_machine(&args, locations)?;
            }
            Command::Serve(args)
        }
        Command::Users(mut command) => {
            let database = command.database_mut();
            if database.db.is_none() {
                let file = ServerFileConfig::load_or_default(&config_path)?;
                database.db = locations.complete(file).db;
            }
            Command::Users(command)
        }
        Command::Config(mut command) => {
            let file = match &mut command {
                ConfigCommand::Show(file) => file,
                ConfigCommand::Set(args) => &mut args.file,
            };
            if file.config.is_none() {
                file.config = Some(config_path);
            }
            Command::Config(command)
        }
    })
}

/// The `Host` header values that reach the configured address from this machine and the network,
/// followed by the configured ones,
/// so that other devices can use a server bound to every interface.
fn hosts_of_this_machine(
    args: &ServeArgs,
    locations: &AppLocations,
) -> anyhow::Result<Vec<String>> {
    let file = load_file_config(args)?.with_defaults(locations.defaults());
    let settings = resolve_serve_settings(args, &file);
    Ok(expected_hosts(
        settings.bind.port(),
        settings.bind,
        &lan_ipv4_addresses(),
        host_name().as_deref(),
        &settings.expected_hosts,
    ))
}
