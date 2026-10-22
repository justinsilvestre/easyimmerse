use std::fmt;
use std::path::{Path, PathBuf};

use crate::mail::RecordedMails;

/// Settings the router needs to authenticate requests.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ApiConfig {
    /// The token whose holder owns the machine the server runs on, and may do anything.
    /// None when only accounts may use the server.
    pub launch_token: Option<String>,
    /// Whether the server has accounts, and how new ones are made. None when it has none.
    pub accounts: Option<AccountsConfig>,
    /// How the server sends email, which it needs to confirm addresses and reset passwords.
    /// None when it sends none, and then it offers neither.
    pub mail: Option<MailConfig>,
    /// Whether requests may name files on the server's own file system.
    pub allow_local_paths: bool,
    /// Values the `Host` header must equal exactly, such as `127.0.0.1:8787`.
    pub expected_hosts: Vec<String>,
    /// Directories the server writes itself, such as the one plugins fetch media into.
    /// Every token may read the files inside them, since no request chose their paths.
    pub server_dirs: Vec<PathBuf>,
    /// Where the server keeps copies of media bytes, and how many bytes each account may keep there.
    /// None when it keeps none.
    pub uploads: Option<UploadsConfig>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UploadsConfig {
    /// The directory the copies are written to, which the server creates when it is missing.
    pub dir: PathBuf,
    /// The most bytes a privileged account or an administrator may keep; None for no limit.
    pub account_quota_bytes: Option<u64>,
    /// The most bytes a library user may keep; 0 lets library users keep none.
    pub library_user_quota_bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountsConfig {
    /// Whether anyone may create an account, rather than only an administrator.
    pub open_signup: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MailConfig {
    pub transport: MailTransport,
    /// The address mail is sent from, such as `easyImmerse <accounts@example.com>`.
    pub from_address: String,
    /// Where the web app that opens the mailed links is reachable, such as `https://example.com/app`.
    pub public_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MailTransport {
    Smtp(SmtpConfig),
    /// Writes each mail to standard error instead of sending it, for development.
    Stderr,
    /// Keeps each mail in memory, where tests read it.
    Recording(RecordedMails),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SmtpConfig {
    pub host: String,
    pub port: u16,
    /// None for a server that takes mail without logging in.
    pub credentials: Option<SmtpCredentials>,
    pub security: SmtpSecurity,
}

#[derive(Clone, PartialEq, Eq)]
pub struct SmtpCredentials {
    pub username: String,
    pub password: String,
}

/// How the connection to the SMTP server is encrypted.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SmtpSecurity {
    /// TLS from the start, usually on port 465.
    Tls,
    /// A plain connection that must be upgraded with STARTTLS, usually on port 587.
    StartTls,
    /// No encryption, for a relay on the same machine or network.
    None,
}

/// Leaves the password out, so that it never reaches a log.
impl fmt::Debug for SmtpCredentials {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("SmtpCredentials")
            .field("username", &self.username)
            .finish_non_exhaustive()
    }
}

impl ApiConfig {
    /// Builds the configuration for a server bound to the loopback interface on `port`,
    /// with a launch token and no accounts.
    pub fn for_loopback(port: u16, launch_token: String, allow_local_paths: bool) -> Self {
        Self {
            launch_token: Some(launch_token),
            ..Self::for_loopback_hosts(port, allow_local_paths)
        }
    }

    /// Builds the configuration for a server bound to the loopback interface on `port`,
    /// with neither a launch token nor accounts, which the caller sets.
    pub fn for_loopback_hosts(port: u16, allow_local_paths: bool) -> Self {
        Self {
            launch_token: None,
            accounts: None,
            mail: None,
            allow_local_paths,
            expected_hosts: vec![format!("127.0.0.1:{port}"), format!("localhost:{port}")],
            server_dirs: Vec::new(),
            uploads: None,
        }
    }

    /// Whether some token can authenticate: the launch token, or the session of an account.
    pub fn can_authenticate(&self) -> bool {
        self.launch_token.is_some() || self.accounts.is_some()
    }

    /// The mail settings, when the server both has accounts and sends email.
    pub fn account_mail(&self) -> Option<&MailConfig> {
        self.accounts.as_ref().and(self.mail.as_ref())
    }

    /// Whether `path` names an existing file inside one of the server's own directories.
    /// Both sides are canonicalized, so neither symbolic links nor `..` components escape.
    pub fn is_server_path(&self, path: &str) -> bool {
        let Ok(path) = Path::new(path).canonicalize() else {
            return false;
        };
        self.server_dirs
            .iter()
            .filter_map(|dir| dir.canonicalize().ok())
            .any(|dir| path.starts_with(dir))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config_with_server_dir(dir: &Path) -> ApiConfig {
        let mut config = ApiConfig::for_loopback(1, "t".to_string(), false);
        config.server_dirs.push(dir.to_path_buf());
        config
    }

    #[test]
    fn recognizes_a_file_inside_a_server_dir() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("a.txt");
        std::fs::write(&file, "a").unwrap();
        assert!(config_with_server_dir(dir.path()).is_server_path(&file.to_string_lossy()));
    }

    #[test]
    fn does_not_recognize_a_file_outside_the_server_dirs() {
        let dir = tempfile::tempdir().unwrap();
        let other = tempfile::tempdir().unwrap();
        let file = other.path().join("a.txt");
        std::fs::write(&file, "a").unwrap();
        assert!(!config_with_server_dir(dir.path()).is_server_path(&file.to_string_lossy()));
    }

    #[test]
    fn does_not_recognize_a_path_that_escapes_a_server_dir() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("escaped.txt");
        std::fs::write(&file, "a").unwrap();
        let inside = dir.path().join("inside");
        std::fs::create_dir(&inside).unwrap();
        let escaping = inside.join("..").join("escaped.txt");
        assert!(!config_with_server_dir(&inside).is_server_path(&escaping.to_string_lossy()));
    }

    #[test]
    fn a_config_with_a_launch_token_can_authenticate() {
        assert!(ApiConfig::for_loopback(1, "t".to_string(), false).can_authenticate());
    }

    #[test]
    fn a_config_with_only_accounts_can_authenticate() {
        let mut config = ApiConfig::for_loopback_hosts(1, false);
        config.accounts = Some(AccountsConfig { open_signup: false });
        assert!(config.can_authenticate());
    }

    #[test]
    fn a_config_without_a_launch_token_or_accounts_cannot_authenticate() {
        assert!(!ApiConfig::for_loopback_hosts(1, false).can_authenticate());
    }

    #[test]
    fn debug_output_leaves_out_the_smtp_password() {
        let credentials = SmtpCredentials {
            username: "mailer".to_string(),
            password: "hunter22".to_string(),
        };
        assert!(!format!("{credentials:?}").contains("hunter22"));
    }

    #[test]
    fn a_server_without_accounts_offers_no_account_mail() {
        let mut config = ApiConfig::for_loopback(1, "t".to_string(), false);
        config.mail = Some(MailConfig {
            transport: MailTransport::Stderr,
            from_address: "a@example.com".to_string(),
            public_url: "https://example.com".to_string(),
        });
        assert_eq!(config.account_mail(), None);
    }

    #[test]
    fn expects_both_loopback_spellings_of_the_host() {
        let config = ApiConfig::for_loopback(8787, "t".to_string(), false);
        assert_eq!(
            config.expected_hosts,
            vec!["127.0.0.1:8787", "localhost:8787"]
        );
    }
}
