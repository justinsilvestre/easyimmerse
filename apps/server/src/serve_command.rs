use std::net::SocketAddr;
use std::path::Path;

use anyhow::Context;
use easyimmerse_api::mail::check_mail_config;
use easyimmerse_api::{
    AccountsConfig, ApiConfig, MailConfig, MailTransport, ServeOptions, SmtpConfig,
    SmtpCredentials, SmtpSecurity, serve,
};
use easyimmerse_storage::Storage;
use tokio::net::TcpListener;

use crate::cli::{ServeArgs, SmtpSecurityArg};

/// The environment variable that holds the password of `--smtp-user`, which no flag takes.
const SMTP_PASSWORD_VARIABLE: &str = "EASYIMMERSE_SMTP_PASSWORD";
/// The sender of the mail that `--mail-to-stderr` prints, when `--mail-from` names none.
const DEVELOPMENT_SENDER: &str = "easyImmerse <easyimmerse@localhost>";

pub async fn run(args: ServeArgs) -> anyhow::Result<()> {
    refuse_unreachable_accounts(&args)?;
    let mail = mail_config(&args, std::env::var(SMTP_PASSWORD_VARIABLE).ok())?;
    let listener = TcpListener::bind(args.bind)
        .await
        .with_context(|| format!("could not bind {}", args.bind))?;
    let addr = listener.local_addr()?;
    let config = ApiConfig {
        mail,
        ..build_config(&args, addr)
    };
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

/// Refuses accounts on an in-memory database when nobody could ever authenticate:
/// the `users` command needs a database file, and without `--open-signup` or `--token`
/// the API cannot create the first account.
fn refuse_unreachable_accounts(args: &ServeArgs) -> anyhow::Result<()> {
    let is_in_memory = args.db == ":memory:";
    if args.accounts && is_in_memory && !args.open_signup && args.token.is_none() {
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
    args: &ServeArgs,
    smtp_password: Option<String>,
) -> anyhow::Result<Option<MailConfig>> {
    let Some(transport) = mail_transport(args, smtp_password)? else {
        if args.mail_from.is_some() || args.public_url.is_some() {
            anyhow::bail!(
                "--mail-from and --public-url need a way to send mail: pass --smtp-host, \
                 or --mail-to-stderr for development"
            );
        }
        return Ok(None);
    };
    if !args.accounts {
        anyhow::bail!("only accounts receive mail: pass --accounts, or leave out the mail options");
    }
    let Some(public_url) = args.public_url.clone() else {
        anyhow::bail!(
            "mailed links need --public-url, the address where the web app is reachable, \
             such as https://example.com"
        );
    };
    let from_address = match (&args.mail_from, &transport) {
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
    args: &ServeArgs,
    smtp_password: Option<String>,
) -> anyhow::Result<Option<MailTransport>> {
    let Some(host) = &args.smtp_host else {
        let has_smtp_option =
            args.smtp_port.is_some() || args.smtp_user.is_some() || args.smtp_security.is_some();
        if has_smtp_option {
            anyhow::bail!("--smtp-port, --smtp-user and --smtp-security need --smtp-host");
        }
        return Ok(args.mail_to_stderr.then_some(MailTransport::Stderr));
    };
    if args.mail_to_stderr {
        anyhow::bail!("pass --smtp-host or --mail-to-stderr, not both");
    }
    let smtp = smtp_config(args, host, smtp_password)?;
    Ok(Some(MailTransport::Smtp(smtp)))
}

/// The port defaults to the usual one for the security.
fn smtp_config(
    args: &ServeArgs,
    host: &str,
    smtp_password: Option<String>,
) -> anyhow::Result<SmtpConfig> {
    let security = match args.smtp_security.unwrap_or(SmtpSecurityArg::Starttls) {
        SmtpSecurityArg::Tls => SmtpSecurity::Tls,
        SmtpSecurityArg::Starttls => SmtpSecurity::StartTls,
        SmtpSecurityArg::None => SmtpSecurity::None,
    };
    let default_port = match security {
        SmtpSecurity::Tls => 465,
        SmtpSecurity::StartTls => 587,
        SmtpSecurity::None => 25,
    };
    let credentials = match (&args.smtp_user, smtp_password) {
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
        port: args.smtp_port.unwrap_or(default_port),
        credentials,
        security,
    })
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
            smtp_host: None,
            smtp_port: None,
            smtp_user: None,
            smtp_security: None,
            mail_from: None,
            public_url: None,
            mail_to_stderr: false,
        }
    }

    fn hosts_for(bind: &str, expected_hosts: &[&str]) -> Vec<String> {
        let args = args(bind, expected_hosts);
        build_config(&args, args.bind).expected_hosts
    }

    fn config_for(args: &ServeArgs) -> ApiConfig {
        build_config(args, args.bind)
    }

    fn unreachable_accounts_args() -> ServeArgs {
        let mut args = args("127.0.0.1:8787", &[]);
        args.token = None;
        args.accounts = true;
        args
    }

    #[test]
    fn refuses_accounts_on_an_in_memory_database_without_signup_or_a_token() {
        assert!(refuse_unreachable_accounts(&unreachable_accounts_args()).is_err());
    }

    #[test]
    fn allows_accounts_on_a_database_file() {
        let mut args = unreachable_accounts_args();
        args.db = "accounts.db".to_string();
        assert!(refuse_unreachable_accounts(&args).is_ok());
    }

    #[test]
    fn allows_accounts_on_an_in_memory_database_with_open_signup() {
        let mut args = unreachable_accounts_args();
        args.open_signup = true;
        assert!(refuse_unreachable_accounts(&args).is_ok());
    }

    #[test]
    fn allows_accounts_on_an_in_memory_database_with_a_token() {
        let mut args = unreachable_accounts_args();
        args.token = Some("t".to_string());
        assert!(refuse_unreachable_accounts(&args).is_ok());
    }

    #[test]
    fn allows_an_in_memory_database_without_accounts() {
        let mut args = unreachable_accounts_args();
        args.accounts = false;
        assert!(refuse_unreachable_accounts(&args).is_ok());
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

    /// Arguments for a server with accounts that sends mail through `smtp.example.com`.
    fn smtp_args() -> ServeArgs {
        let mut args = args("127.0.0.1:8787", &[]);
        args.accounts = true;
        args.smtp_host = Some("smtp.example.com".to_string());
        args.mail_from = Some("accounts@example.com".to_string());
        args.public_url = Some("https://example.com".to_string());
        args
    }

    fn smtp_of(args: &ServeArgs, smtp_password: Option<String>) -> SmtpConfig {
        match mail_config(args, smtp_password).unwrap().unwrap().transport {
            MailTransport::Smtp(smtp) => smtp,
            other => panic!("expected SMTP, got {other:?}"),
        }
    }

    #[test]
    fn sends_no_mail_without_mail_options() {
        let args = args("127.0.0.1:8787", &[]);
        assert_eq!(mail_config(&args, None).unwrap(), None);
    }

    #[test]
    fn refuses_mail_without_accounts() {
        let mut args = smtp_args();
        args.accounts = false;
        assert!(mail_config(&args, None).is_err());
    }

    #[test]
    fn refuses_a_mail_transport_without_a_public_url() {
        let mut args = smtp_args();
        args.public_url = None;
        assert!(mail_config(&args, None).is_err());
    }

    #[test]
    fn refuses_smtp_without_a_sender() {
        let mut args = smtp_args();
        args.mail_from = None;
        assert!(mail_config(&args, None).is_err());
    }

    #[test]
    fn refuses_both_transports() {
        let mut args = smtp_args();
        args.mail_to_stderr = true;
        assert!(mail_config(&args, None).is_err());
    }

    #[test]
    fn refuses_an_smtp_user_without_a_password() {
        let mut args = smtp_args();
        args.smtp_user = Some("mailer".to_string());
        assert!(mail_config(&args, None).is_err());
    }

    #[test]
    fn refuses_smtp_options_without_a_host() {
        let mut args = smtp_args();
        args.smtp_host = None;
        args.mail_to_stderr = true;
        args.smtp_port = Some(2525);
        assert!(mail_config(&args, None).is_err());
    }

    #[test]
    fn refuses_a_public_url_without_a_transport() {
        let mut args = smtp_args();
        args.smtp_host = None;
        assert!(mail_config(&args, None).is_err());
    }

    #[test]
    fn refuses_a_public_url_without_a_scheme() {
        let mut args = smtp_args();
        args.public_url = Some("example.com".to_string());
        assert!(mail_config(&args, None).is_err());
    }

    #[test]
    fn defaults_to_starttls_on_port_587() {
        assert_eq!(smtp_of(&smtp_args(), None).port, 587);
    }

    #[test]
    fn uses_port_465_for_tls() {
        let mut args = smtp_args();
        args.smtp_security = Some(SmtpSecurityArg::Tls);
        assert_eq!(smtp_of(&args, None).port, 465);
    }

    #[test]
    fn takes_the_smtp_password_from_the_environment() {
        let mut args = smtp_args();
        args.smtp_user = Some("mailer".to_string());
        let smtp = smtp_of(&args, Some("hunter22".to_string()));
        assert_eq!(
            smtp.credentials.map(|credentials| credentials.password),
            Some("hunter22".to_string())
        );
    }

    #[test]
    fn gives_mail_to_stderr_a_development_sender() {
        let mut args = smtp_args();
        args.smtp_host = None;
        args.mail_from = None;
        args.mail_to_stderr = true;
        let config = mail_config(&args, None).unwrap().unwrap();
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
