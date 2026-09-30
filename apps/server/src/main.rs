mod cli;
mod openapi_command;
mod serve_command;

use clap::Parser;

use crate::cli::{Cli, Command};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();
    match Cli::parse().command {
        Command::Serve(args) => serve_command::run(args).await,
        Command::Openapi(args) => openapi_command::run(args),
    }
}
