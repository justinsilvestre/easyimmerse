use std::net::SocketAddr;
use std::path::Path;

use anyhow::Context;
use easyimmerse_api::{AccountsConfig, ApiConfig, ServeOptions, serve};
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
        plugins_dir: args.plugins_dir.clone(),
        media_dir: args.media_dir.clone(),
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
/// A random launch token is made only when there is neither `--token` nor `--accounts`.
/// A server bound to an unspecified address such as `0.0.0.0`
/// is reached through interface addresses it cannot know,
/// so those must be passed with `--expected-host`.
fn build_config(args: &ServeArgs, addr: SocketAddr) -> ApiConfig {
    let mut config = ApiConfig::for_loopback_hosts(addr.port(), args.allow_local_paths);
    config.launch_token = args
        .token
        .clone()
        .or_else(|| (!args.accounts).then(generate_and_print_token));
    config.accounts = args.accounts.then_some(AccountsConfig {
        open_signup: args.open_signup,
    });
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
            accounts: false,
            open_signup: false,
            db: ":memory:".to_string(),
            allow_local_paths: false,
            seed_placeholders: false,
            seed_sample_content: false,
            cache_dir: None,
            plugins_dir: None,
            media_dir: None,
            expected_hosts: expected_hosts.iter().map(|host| host.to_string()).collect(),
        }
    }

    fn hosts_for(bind: &str, expected_hosts: &[&str]) -> Vec<String> {
        let args = args(bind, expected_hosts);
        build_config(&args, args.bind).expected_hosts
    }

    fn config_for(args: &ServeArgs) -> ApiConfig {
        build_config(args, args.bind)
    }

    #[test]
    fn makes_no_launch_token_for_accounts_without_a_token() {
        let mut args = args("127.0.0.1:8787", &[]);
        args.token = None;
        args.accounts = true;
        assert_eq!(config_for(&args).launch_token, None);
    }

    #[test]
    fn makes_a_launch_token_without_accounts_or_a_token() {
        let mut args = args("127.0.0.1:8787", &[]);
        args.token = None;
        assert!(config_for(&args).launch_token.is_some());
    }

    #[test]
    fn passes_open_signup_to_the_accounts() {
        let mut args = args("127.0.0.1:8787", &[]);
        args.accounts = true;
        args.open_signup = true;
        assert_eq!(
            config_for(&args).accounts,
            Some(AccountsConfig { open_signup: true })
        );
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
