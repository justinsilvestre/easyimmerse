//! The `serve` command, and the functions the desktop app uses to run the same server.

use std::net::SocketAddr;
use std::path::Path;

use anyhow::Context;
use easyimmerse_api::{AccountsConfig, ApiConfig, ServeOptions, ServerHandle, serve};
use easyimmerse_storage::Storage;
use tokio::net::TcpListener;

use crate::cli::ServeArgs;
use crate::config_file::ServerFileConfig;
use crate::serve_settings::{ServeSettings, resolve_serve_settings};

/// A server that has started, with what the person starting it needs to know.
pub struct StartedServer {
    pub handle: ServerHandle,
    /// The random launch token made because none was configured,
    /// which the person needs to connect a client.
    pub generated_token: Option<String>,
}

pub async fn run(args: ServeArgs) -> anyhow::Result<()> {
    run_with_defaults(args, &ServerFileConfig::default()).await
}

/// Runs the server like [`run`],
/// taking each setting that neither the command line nor the config file gives from `defaults`.
pub async fn run_with_defaults(args: ServeArgs, defaults: &ServerFileConfig) -> anyhow::Result<()> {
    let file = load_file_config(&args)?.with_defaults(defaults.clone());
    let settings = resolve_serve_settings(&args, &file);
    let started = start_server(&settings).await?;
    if let Some(token) = &started.generated_token {
        eprintln!("token: {token}");
    }
    println!("listening on http://{}", started.handle.addr);
    tokio::signal::ctrl_c()
        .await
        .context("could not listen for Ctrl-C")?;
    tracing::info!("shutting down");
    started.handle.shutdown().await?;
    Ok(())
}

/// Reads the config file that `--config` or `EASYIMMERSE_CONFIG` names,
/// or returns an empty config when neither does.
pub fn load_file_config(args: &ServeArgs) -> anyhow::Result<ServerFileConfig> {
    match &args.config {
        Some(path) => Ok(ServerFileConfig::load(path)?),
        None => Ok(ServerFileConfig::default()),
    }
}

/// Binds the configured address and starts a server on it.
pub async fn start_server(settings: &ServeSettings) -> anyhow::Result<StartedServer> {
    refuse_unauthenticated_settings(settings)?;
    let listener = TcpListener::bind(settings.bind)
        .await
        .with_context(|| format!("could not bind {}", settings.bind))?;
    start_accepted_server_on(listener, settings).await
}

/// Starts a server on a listener the caller bound, such as one on a random loopback port.
/// The settings' bind address is ignored.
pub async fn start_server_on(
    listener: TcpListener,
    settings: &ServeSettings,
) -> anyhow::Result<StartedServer> {
    refuse_unauthenticated_settings(settings)?;
    start_accepted_server_on(listener, settings).await
}

/// Starts a server whose settings passed `refuse_unauthenticated_settings`.
async fn start_accepted_server_on(
    listener: TcpListener,
    settings: &ServeSettings,
) -> anyhow::Result<StartedServer> {
    let addr = listener.local_addr()?;
    let (config, generated_token) = build_config(settings, addr);
    let storage = open_storage(settings)?;
    let options = ServeOptions {
        cache_dir: settings.cache_dir.clone(),
        plugins_dir: settings.plugins_dir.clone(),
        media_dir: settings.media_dir.clone(),
        ffmpeg_dir: settings.ffmpeg_dir.clone(),
        web_app_dir: settings.web_app_dir_to_serve(),
    };
    let handle = serve(listener, config, storage, options).await?;
    Ok(StartedServer {
        handle,
        generated_token,
    })
}

fn refuse_unauthenticated_settings(settings: &ServeSettings) -> anyhow::Result<()> {
    if settings.open_signup && !settings.accounts {
        anyhow::bail!("open signup needs accounts: pass --accounts, or set accounts = true");
    }
    refuse_unreachable_accounts(settings)
}

/// Refuses accounts on an in-memory database when nobody could ever authenticate:
/// the `users` command needs a database file, and without `--open-signup` or `--token`
/// the API cannot create the first account.
fn refuse_unreachable_accounts(settings: &ServeSettings) -> anyhow::Result<()> {
    let is_in_memory = settings.db.is_none();
    if settings.accounts && is_in_memory && !settings.open_signup && settings.token.is_none() {
        anyhow::bail!(
            "with --accounts and an in-memory database, nobody could log in: pass --db with a \
             file and create an administrator with `easyimmerse-server users create`, \
             or pass --open-signup or --token"
        );
    }
    Ok(())
}

/// Accepts the loopback hosts, the bound address itself, and every expected host.
/// A random launch token is made only when there is neither a token nor accounts,
/// and is returned beside the config.
/// A server bound to an unspecified address such as `0.0.0.0`
/// is reached through interface addresses it cannot know,
/// so those must be passed with `--expected-host`.
fn build_config(settings: &ServeSettings, addr: SocketAddr) -> (ApiConfig, Option<String>) {
    let mut config = ApiConfig::for_loopback_hosts(addr.port(), settings.allow_local_paths);
    let generated_token = (settings.token.is_none() && !settings.accounts).then(generate_token);
    config.launch_token = settings.token.clone().or_else(|| generated_token.clone());
    config.accounts = settings.accounts.then_some(AccountsConfig {
        open_signup: settings.open_signup,
    });
    if addr.ip().is_unspecified() {
        warn_when_no_host_is_expected(settings, addr);
    } else {
        push_host(&mut config, addr.to_string());
    }
    for host in &settings.expected_hosts {
        push_host(&mut config, host.clone());
    }
    (config, generated_token)
}

fn push_host(config: &mut ApiConfig, host: String) {
    if !config.expected_hosts.contains(&host) {
        config.expected_hosts.push(host);
    }
}

fn warn_when_no_host_is_expected(settings: &ServeSettings, addr: SocketAddr) {
    if settings.expected_hosts.is_empty() {
        tracing::warn!(
            "bound to {addr} without --expected-host, so only requests addressed to the \
             loopback hosts are accepted"
        );
    }
}

fn generate_token() -> String {
    hex::encode(rand::random::<[u8; 32]>())
}

fn open_storage(settings: &ServeSettings) -> anyhow::Result<Storage> {
    let storage = match &settings.db {
        None => Storage::open_in_memory()?,
        Some(path) => {
            Storage::open(path).with_context(|| format!("could not open {}", path.display()))?
        }
    };
    if settings.seed_placeholders {
        storage.seed_placeholder_projects()?;
    }
    if settings.seed_sample_content {
        let fixtures_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures");
        storage
            .seed_sample_content(&fixtures_dir)
            .context("could not add the sample content")?;
    }
    Ok(storage)
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::*;
    use crate::serve_settings::DEFAULT_BIND;

    fn settings(bind: &str, expected_hosts: &[&str]) -> ServeSettings {
        ServeSettings {
            bind: bind.parse().unwrap(),
            token: Some("t".to_string()),
            accounts: false,
            open_signup: false,
            db: None,
            allow_local_paths: false,
            seed_placeholders: false,
            seed_sample_content: false,
            cache_dir: None,
            plugins_dir: None,
            media_dir: None,
            ffmpeg_dir: None,
            expected_hosts: expected_hosts.iter().map(|host| host.to_string()).collect(),
            web_app_dir: None,
            api_only: false,
        }
    }

    fn hosts_for(bind: &str, expected_hosts: &[&str]) -> Vec<String> {
        let settings = settings(bind, expected_hosts);
        build_config(&settings, settings.bind).0.expected_hosts
    }

    fn config_for(settings: &ServeSettings) -> ApiConfig {
        build_config(settings, settings.bind).0
    }

    fn unreachable_accounts_settings() -> ServeSettings {
        let mut settings = settings("127.0.0.1:8787", &[]);
        settings.token = None;
        settings.accounts = true;
        settings
    }

    #[test]
    fn refuses_accounts_on_an_in_memory_database_without_signup_or_a_token() {
        assert!(refuse_unauthenticated_settings(&unreachable_accounts_settings()).is_err());
    }

    #[test]
    fn allows_accounts_on_a_database_file() {
        let mut settings = unreachable_accounts_settings();
        settings.db = Some(PathBuf::from("accounts.db"));
        assert!(refuse_unauthenticated_settings(&settings).is_ok());
    }

    #[test]
    fn allows_accounts_on_an_in_memory_database_with_open_signup() {
        let mut settings = unreachable_accounts_settings();
        settings.open_signup = true;
        assert!(refuse_unauthenticated_settings(&settings).is_ok());
    }

    #[test]
    fn allows_accounts_on_an_in_memory_database_with_a_token() {
        let mut settings = unreachable_accounts_settings();
        settings.token = Some("t".to_string());
        assert!(refuse_unauthenticated_settings(&settings).is_ok());
    }

    #[test]
    fn allows_an_in_memory_database_without_accounts() {
        let mut settings = unreachable_accounts_settings();
        settings.accounts = false;
        assert!(refuse_unauthenticated_settings(&settings).is_ok());
    }

    #[test]
    fn refuses_open_signup_without_accounts() {
        let mut settings = settings("127.0.0.1:8787", &[]);
        settings.open_signup = true;
        assert!(refuse_unauthenticated_settings(&settings).is_err());
    }

    #[test]
    fn makes_no_launch_token_for_accounts_without_a_token() {
        let mut settings = settings("127.0.0.1:8787", &[]);
        settings.token = None;
        settings.accounts = true;
        assert_eq!(config_for(&settings).launch_token, None);
    }

    #[test]
    fn makes_a_launch_token_without_accounts_or_a_token() {
        let mut settings = settings("127.0.0.1:8787", &[]);
        settings.token = None;
        assert!(config_for(&settings).launch_token.is_some());
    }

    #[test]
    fn returns_the_launch_token_it_made() {
        let mut settings = settings("127.0.0.1:8787", &[]);
        settings.token = None;
        let (config, generated_token) = build_config(&settings, settings.bind);
        assert_eq!(config.launch_token, generated_token);
    }

    #[test]
    fn returns_no_generated_token_when_one_is_configured() {
        let settings = settings("127.0.0.1:8787", &[]);
        assert_eq!(build_config(&settings, settings.bind).1, None);
    }

    #[test]
    fn passes_open_signup_to_the_accounts() {
        let mut settings = settings("127.0.0.1:8787", &[]);
        settings.accounts = true;
        settings.open_signup = true;
        assert_eq!(
            config_for(&settings).accounts,
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
    fn expects_every_configured_host() {
        let hosts = hosts_for("0.0.0.0:8787", &["media.local:8787"]);
        assert!(hosts.contains(&"media.local:8787".to_string()));
    }

    #[test]
    fn does_not_expect_the_unspecified_address_itself() {
        assert!(!hosts_for("0.0.0.0:8787", &[]).contains(&"0.0.0.0:8787".to_string()));
    }

    #[test]
    fn does_not_repeat_the_default_loopback_host() {
        let hosts = hosts_for(&DEFAULT_BIND.to_string(), &[]);
        assert_eq!(
            hosts
                .iter()
                .filter(|host| *host == "127.0.0.1:8787")
                .count(),
            1
        );
    }
}
