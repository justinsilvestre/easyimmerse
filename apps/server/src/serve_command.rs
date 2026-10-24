//! The `serve` command, and the functions the desktop app uses to run the same server.

use std::net::SocketAddr;
use std::path::Path;

use anyhow::Context;
use easyimmerse_api::mail::check_mail_config;
use easyimmerse_api::{
    AccountsConfig, ApiConfig, MailConfig, MailTransport, ServeOptions, ServerHandle, SmtpConfig,
    SmtpCredentials, SmtpSecurity, UploadsConfig, serve,
};
use easyimmerse_storage::{OwnerId, Storage};
use tokio::net::TcpListener;

use crate::cli::{ServeArgs, SmtpSecurityArg};
use crate::config_file::ServerFileConfig;
use crate::serve_settings::{ServeSettings, resolve_serve_settings};

/// The environment variable that holds the password of `--smtp-user`, which no flag takes.
const SMTP_PASSWORD_VARIABLE: &str = "EASYIMMERSE_SMTP_PASSWORD";
/// The sender of the mail that `--mail-to-stderr` prints, when `--mail-from` names none.
const DEVELOPMENT_SENDER: &str = "easyImmerse <easyimmerse@localhost>";

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
    let mail = check_settings(settings)?;
    let listener = TcpListener::bind(settings.bind)
        .await
        .with_context(|| format!("could not bind {}", settings.bind))?;
    start_accepted_server_on(listener, settings, mail).await
}

/// Starts a server on a listener the caller bound, such as one on a random loopback port.
/// The settings' bind address is ignored.
pub async fn start_server_on(
    listener: TcpListener,
    settings: &ServeSettings,
) -> anyhow::Result<StartedServer> {
    let mail = check_settings(settings)?;
    start_accepted_server_on(listener, settings, mail).await
}

/// Starts a server whose settings passed `check_settings`, which gave `mail`.
async fn start_accepted_server_on(
    listener: TcpListener,
    settings: &ServeSettings,
    mail: Option<MailConfig>,
) -> anyhow::Result<StartedServer> {
    let addr = listener.local_addr()?;
    let (mut config, generated_token) = build_config(settings, addr);
    config.mail = mail;
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

/// Refuses settings the server could not run with, and builds the mail settings from them.
fn check_settings(settings: &ServeSettings) -> anyhow::Result<Option<MailConfig>> {
    refuse_unauthenticated_settings(settings)?;
    refuse_quotas_without_uploads_dir(settings)?;
    mail_config(settings, std::env::var(SMTP_PASSWORD_VARIABLE).ok())
}

fn refuse_quotas_without_uploads_dir(settings: &ServeSettings) -> anyhow::Result<()> {
    let has_quota =
        settings.upload_quota_mb.is_some() || settings.library_user_upload_quota_mb.is_some();
    if has_quota && settings.uploads_dir.is_none() {
        anyhow::bail!("upload quotas need --uploads-dir, the directory that holds the copies");
    }
    Ok(())
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

/// Builds the mail settings from the mail options, refusing combinations that could not send mail
/// or that would leave an option without effect.
fn mail_config(
    settings: &ServeSettings,
    smtp_password: Option<String>,
) -> anyhow::Result<Option<MailConfig>> {
    let Some(transport) = mail_transport(settings, smtp_password)? else {
        if settings.mail_from.is_some() || settings.public_url.is_some() {
            anyhow::bail!(
                "--mail-from and --public-url need a way to send mail: pass --smtp-host, \
                 or --mail-to-stderr for development"
            );
        }
        return Ok(None);
    };
    if !settings.accounts {
        anyhow::bail!("only accounts receive mail: pass --accounts, or leave out the mail options");
    }
    let Some(public_url) = settings.public_url.clone() else {
        anyhow::bail!(
            "mailed links need --public-url, the address where the web app is reachable, \
             such as https://example.com"
        );
    };
    let from_address = match (&settings.mail_from, &transport) {
        (Some(from), _) => from.clone(),
        (None, MailTransport::Stderr) => DEVELOPMENT_SENDER.to_string(),
        (None, _) => anyhow::bail!("--smtp-host needs --mail-from, the address mail is sent from"),
    };
    let config = MailConfig {
        transport,
        from_address,
        public_url,
    };
    check_mail_config(&config)?;
    Ok(Some(config))
}

fn mail_transport(
    settings: &ServeSettings,
    smtp_password: Option<String>,
) -> anyhow::Result<Option<MailTransport>> {
    let Some(host) = &settings.smtp_host else {
        let has_smtp_option = settings.smtp_port.is_some()
            || settings.smtp_user.is_some()
            || settings.smtp_security.is_some();
        if has_smtp_option {
            anyhow::bail!("--smtp-port, --smtp-user and --smtp-security need --smtp-host");
        }
        return Ok(settings.mail_to_stderr.then_some(MailTransport::Stderr));
    };
    if settings.mail_to_stderr {
        anyhow::bail!("pass --smtp-host or --mail-to-stderr, not both");
    }
    let smtp = smtp_config(settings, host, smtp_password)?;
    Ok(Some(MailTransport::Smtp(smtp)))
}

/// The port defaults to the usual one for the security.
fn smtp_config(
    settings: &ServeSettings,
    host: &str,
    smtp_password: Option<String>,
) -> anyhow::Result<SmtpConfig> {
    let security = match settings.smtp_security.unwrap_or(SmtpSecurityArg::Starttls) {
        SmtpSecurityArg::Tls => SmtpSecurity::Tls,
        SmtpSecurityArg::Starttls => SmtpSecurity::StartTls,
        SmtpSecurityArg::None => SmtpSecurity::None,
    };
    let default_port = match security {
        SmtpSecurity::Tls => 465,
        SmtpSecurity::StartTls => 587,
        SmtpSecurity::None => 25,
    };
    let credentials = match (&settings.smtp_user, smtp_password) {
        (Some(username), Some(password)) => Some(SmtpCredentials {
            username: username.clone(),
            password,
        }),
        (Some(_), None) => {
            anyhow::bail!("--smtp-user needs its password in {SMTP_PASSWORD_VARIABLE}")
        }
        (None, _) => None,
    };
    Ok(SmtpConfig {
        host: host.to_string(),
        port: settings.smtp_port.unwrap_or(default_port),
        credentials,
        security,
    })
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
    config.uploads = uploads_config(settings);
    config.device_name = settings.device_name.clone();
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

/// Where copies of media are kept and how many bytes each account may keep there.
/// Library users keep no copies unless given a quota.
fn uploads_config(settings: &ServeSettings) -> Option<UploadsConfig> {
    settings.uploads_dir.clone().map(|dir| UploadsConfig {
        dir,
        account_quota_bytes: settings.upload_quota_mb.map(megabytes),
        library_user_quota_bytes: megabytes(settings.library_user_upload_quota_mb.unwrap_or(0)),
    })
}

fn megabytes(count: u64) -> u64 {
    count.saturating_mul(1_000_000)
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
        storage.seed_placeholder_projects(&OwnerId::launch())?;
    }
    if settings.seed_sample_content {
        seed_sample_content(&storage);
    }
    Ok(storage)
}

/// Adds sample media and dictionaries from the fixtures of the repository the server was built from.
/// A failure is only logged, because the server works without them,
/// and a build that runs on another device, such as a phone, cannot reach that repository.
fn seed_sample_content(storage: &Storage) {
    let fixtures_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures");
    if let Err(error) = storage.seed_sample_content(&fixtures_dir) {
        tracing::warn!("could not add the sample content: {error}");
    }
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
            uploads_dir: None,
            upload_quota_mb: None,
            library_user_upload_quota_mb: None,
            smtp_host: None,
            smtp_port: None,
            smtp_user: None,
            smtp_security: None,
            mail_from: None,
            public_url: None,
            mail_to_stderr: false,
            device_name: None,
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
    fn refuses_an_upload_quota_without_an_uploads_directory() {
        let mut settings = settings("127.0.0.1:8787", &[]);
        settings.upload_quota_mb = Some(5);
        assert!(refuse_quotas_without_uploads_dir(&settings).is_err());
    }

    #[test]
    fn accepts_an_upload_quota_with_an_uploads_directory() {
        let mut settings = uploads_settings();
        settings.upload_quota_mb = Some(5);
        assert!(refuse_quotas_without_uploads_dir(&settings).is_ok());
    }

    #[test]
    fn keeps_no_copies_without_an_uploads_directory() {
        let settings = settings("127.0.0.1:8787", &[]);
        assert_eq!(config_for(&settings).uploads, None);
    }

    #[test]
    fn keeps_copies_in_the_uploads_directory() {
        let mut settings = settings("127.0.0.1:8787", &[]);
        settings.uploads_dir = Some("/srv/uploads".into());
        let uploads = config_for(&settings).uploads.unwrap();
        assert_eq!(uploads.dir, std::path::PathBuf::from("/srv/uploads"));
    }

    fn uploads_settings() -> ServeSettings {
        let mut settings = settings("127.0.0.1:8787", &[]);
        settings.uploads_dir = Some("/srv/uploads".into());
        settings
    }

    #[test]
    fn gives_accounts_no_upload_limit_without_a_quota() {
        let uploads = config_for(&uploads_settings()).uploads.unwrap();
        assert_eq!(uploads.account_quota_bytes, None);
    }

    #[test]
    fn reads_the_account_upload_quota_in_megabytes() {
        let mut settings = uploads_settings();
        settings.upload_quota_mb = Some(5);
        let uploads = config_for(&settings).uploads.unwrap();
        assert_eq!(uploads.account_quota_bytes, Some(5_000_000));
    }

    #[test]
    fn reads_the_library_user_upload_quota_in_megabytes() {
        let mut settings = uploads_settings();
        settings.library_user_upload_quota_mb = Some(2);
        let uploads = config_for(&settings).uploads.unwrap();
        assert_eq!(uploads.library_user_quota_bytes, 2_000_000);
    }

    /// Arguments for a server with accounts that sends mail through `smtp.example.com`.
    fn smtp_settings() -> ServeSettings {
        let mut settings = settings("127.0.0.1:8787", &[]);
        settings.accounts = true;
        settings.smtp_host = Some("smtp.example.com".to_string());
        settings.mail_from = Some("accounts@example.com".to_string());
        settings.public_url = Some("https://example.com".to_string());
        settings
    }

    fn smtp_of(settings: &ServeSettings, smtp_password: Option<String>) -> SmtpConfig {
        match mail_config(settings, smtp_password)
            .unwrap()
            .unwrap()
            .transport
        {
            MailTransport::Smtp(smtp) => smtp,
            other => panic!("expected SMTP, got {other:?}"),
        }
    }

    #[test]
    fn sends_no_mail_without_mail_options() {
        let settings = settings("127.0.0.1:8787", &[]);
        assert_eq!(mail_config(&settings, None).unwrap(), None);
    }

    #[test]
    fn refuses_mail_without_accounts() {
        let mut settings = smtp_settings();
        settings.accounts = false;
        assert!(mail_config(&settings, None).is_err());
    }

    #[test]
    fn refuses_a_mail_transport_without_a_public_url() {
        let mut settings = smtp_settings();
        settings.public_url = None;
        assert!(mail_config(&settings, None).is_err());
    }

    #[test]
    fn refuses_smtp_without_a_sender() {
        let mut settings = smtp_settings();
        settings.mail_from = None;
        assert!(mail_config(&settings, None).is_err());
    }

    #[test]
    fn refuses_both_transports() {
        let mut settings = smtp_settings();
        settings.mail_to_stderr = true;
        assert!(mail_config(&settings, None).is_err());
    }

    #[test]
    fn refuses_an_smtp_user_without_a_password() {
        let mut settings = smtp_settings();
        settings.smtp_user = Some("mailer".to_string());
        assert!(mail_config(&settings, None).is_err());
    }

    #[test]
    fn refuses_smtp_options_without_a_host() {
        let mut settings = smtp_settings();
        settings.smtp_host = None;
        settings.mail_to_stderr = true;
        settings.smtp_port = Some(2525);
        assert!(mail_config(&settings, None).is_err());
    }

    #[test]
    fn refuses_a_public_url_without_a_transport() {
        let mut settings = smtp_settings();
        settings.smtp_host = None;
        assert!(mail_config(&settings, None).is_err());
    }

    #[test]
    fn refuses_a_public_url_without_a_scheme() {
        let mut settings = smtp_settings();
        settings.public_url = Some("example.com".to_string());
        assert!(mail_config(&settings, None).is_err());
    }

    #[test]
    fn defaults_to_starttls_on_port_587() {
        assert_eq!(smtp_of(&smtp_settings(), None).port, 587);
    }

    #[test]
    fn uses_port_465_for_tls() {
        let mut settings = smtp_settings();
        settings.smtp_security = Some(SmtpSecurityArg::Tls);
        assert_eq!(smtp_of(&settings, None).port, 465);
    }

    #[test]
    fn takes_the_smtp_password_from_the_environment() {
        let mut settings = smtp_settings();
        settings.smtp_user = Some("mailer".to_string());
        let smtp = smtp_of(&settings, Some("hunter22".to_string()));
        assert_eq!(
            smtp.credentials.map(|credentials| credentials.password),
            Some("hunter22".to_string())
        );
    }

    #[test]
    fn gives_mail_to_stderr_a_development_sender() {
        let mut settings = smtp_settings();
        settings.smtp_host = None;
        settings.mail_from = None;
        settings.mail_to_stderr = true;
        let config = mail_config(&settings, None).unwrap().unwrap();
        assert_eq!(config.from_address, DEVELOPMENT_SENDER);
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
