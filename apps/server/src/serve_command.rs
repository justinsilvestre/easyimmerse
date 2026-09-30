use std::path::Path;

use anyhow::Context;
use easyimmerse_api::{ApiConfig, serve};
use easyimmerse_storage::Storage;
use tokio::net::TcpListener;

use crate::cli::ServeArgs;

pub async fn run(args: ServeArgs) -> anyhow::Result<()> {
    let listener = TcpListener::bind(args.bind)
        .await
        .with_context(|| format!("could not bind {}", args.bind))?;
    let addr = listener.local_addr()?;
    let config = build_config(&args, addr.port());
    let storage = open_storage(&args.db, args.seed_placeholders)?;
    let handle = serve(listener, config, storage).await?;
    println!("listening on http://{addr}");
    tokio::signal::ctrl_c()
        .await
        .context("could not listen for Ctrl-C")?;
    tracing::info!("shutting down");
    handle.shutdown().await?;
    Ok(())
}

fn build_config(args: &ServeArgs, port: u16) -> ApiConfig {
    let token = args.token.clone().unwrap_or_else(generate_and_print_token);
    let mut config = ApiConfig::for_loopback(port, token, args.allow_local_paths);
    if !args.bind.ip().is_loopback() {
        config.expected_hosts.push(args.bind.to_string());
    }
    config
}

fn generate_and_print_token() -> String {
    let token = hex::encode(rand::random::<[u8; 32]>());
    eprintln!("token: {token}");
    token
}

fn open_storage(db: &str, seed_placeholders: bool) -> anyhow::Result<Storage> {
    let storage = match db {
        ":memory:" => Storage::open_in_memory()?,
        path => Storage::open(Path::new(path)).with_context(|| format!("could not open {path}"))?,
    };
    if seed_placeholders {
        storage.seed_placeholder_projects()?;
    }
    Ok(storage)
}
