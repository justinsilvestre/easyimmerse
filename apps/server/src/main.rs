use clap::Parser;
use easyimmerse_server::cli::Cli;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(log_filter())
        .init();
    easyimmerse_server::run(Cli::parse().command).await
}

/// Reads the log filter from `RUST_LOG`, showing info and above when it is unset.
fn log_filter() -> tracing_subscriber::EnvFilter {
    tracing_subscriber::EnvFilter::builder()
        .with_default_directive(tracing::Level::INFO.into())
        .from_env_lossy()
}
