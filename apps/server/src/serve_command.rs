use std::net::SocketAddr;
use std::path::Path;

use anyhow::Context;
use easyimmerse_api::{ApiConfig, ServeOptions, serve};
use easyimmerse_storage::Storage;
use tokio::net::TcpListener;

use crate::cli::ServeArgs;

pub async fn run(args: ServeArgs) -> anyhow::Result<()> {
    let listener = TcpListener::bind(args.bind)
        .await
        .with_context(|| format!("could not bind {}", args.bind))?;
    let addr = listener.local_addr()?;
    let config = build_config(&args, addr);
    let storage = open_storage(&args)?;
    let options = ServeOptions {
        cache_dir: args.cache_dir.clone(),
    };
    let handle = serve(listener, config, storage, options).await?;
    println!("listening on http://{addr}");
    tokio::signal::ctrl_c()
        .await
        .context("could not listen for Ctrl-C")?;
    tracing::info!("shutting down");
    handle.shutdown().await?;
    Ok(())
}

/// Accepts the loopback hosts, the bound address itself, and every `--expected-host`.
/// A server bound to an unspecified address such as `0.0.0.0`
/// is reached through interface addresses it cannot know,
/// so those must be passed with `--expected-host`.
fn build_config(args: &ServeArgs, addr: SocketAddr) -> ApiConfig {
    let token = args.token.clone().unwrap_or_else(generate_and_print_token);
    let mut config = ApiConfig::for_loopback(addr.port(), token, args.allow_local_paths);
    if addr.ip().is_unspecified() {
        warn_when_no_host_is_expected(args, addr);
    } else {
        push_host(&mut config, addr.to_string());
    }
    for host in &args.expected_hosts {
        push_host(&mut config, host.clone());
    }
    config
}

fn push_host(config: &mut ApiConfig, host: String) {
    if !config.expected_hosts.contains(&host) {
        config.expected_hosts.push(host);
    }
}

fn warn_when_no_host_is_expected(args: &ServeArgs, addr: SocketAddr) {
    if args.expected_hosts.is_empty() {
        tracing::warn!(
            "bound to {addr} without --expected-host, so only requests addressed to the \
             loopback hosts are accepted"
        );
    }
}

fn generate_and_print_token() -> String {
    let token = hex::encode(rand::random::<[u8; 32]>());
    eprintln!("token: {token}");
    token
}

fn open_storage(args: &ServeArgs) -> anyhow::Result<Storage> {
    let storage = match args.db.as_str() {
        ":memory:" => Storage::open_in_memory()?,
        path => Storage::open(Path::new(path)).with_context(|| format!("could not open {path}"))?,
    };
    if args.seed_placeholders {
        storage.seed_placeholder_projects()?;
    }
    if args.seed_sample_content {
        let fixtures_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures");
        storage
            .seed_sample_content(&fixtures_dir)
            .context("could not add the sample content")?;
    }
    Ok(storage)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(bind: &str, expected_hosts: &[&str]) -> ServeArgs {
        ServeArgs {
            bind: bind.parse().unwrap(),
            token: Some("t".to_string()),
            db: ":memory:".to_string(),
            allow_local_paths: false,
            seed_placeholders: false,
            seed_sample_content: false,
            cache_dir: None,
            expected_hosts: expected_hosts.iter().map(|host| host.to_string()).collect(),
        }
    }

    fn hosts_for(bind: &str, expected_hosts: &[&str]) -> Vec<String> {
        let args = args(bind, expected_hosts);
        build_config(&args, args.bind).expected_hosts
    }

    #[test]
    fn expects_a_bracketed_ipv6_loopback_host() {
        assert!(hosts_for("[::1]:8787", &[]).contains(&"[::1]:8787".to_string()));
    }

    #[test]
    fn expects_a_specific_interface_address() {
        assert!(hosts_for("192.168.1.5:8787", &[]).contains(&"192.168.1.5:8787".to_string()));
    }

    #[test]
    fn expects_every_host_passed_on_the_command_line() {
        let hosts = hosts_for("0.0.0.0:8787", &["media.local:8787"]);
        assert!(hosts.contains(&"media.local:8787".to_string()));
    }

    #[test]
    fn does_not_expect_the_unspecified_address_itself() {
        assert!(!hosts_for("0.0.0.0:8787", &[]).contains(&"0.0.0.0:8787".to_string()));
    }

    #[test]
    fn does_not_repeat_the_default_loopback_host() {
        let hosts = hosts_for("127.0.0.1:8787", &[]);
        assert_eq!(
            hosts
                .iter()
                .filter(|host| *host == "127.0.0.1:8787")
                .count(),
            1
        );
    }
}
