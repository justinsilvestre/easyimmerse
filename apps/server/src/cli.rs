use std::net::SocketAddr;
use std::path::PathBuf;

use clap::{Args, Parser, Subcommand, ValueEnum};
use easyimmerse_core::account::AccountRole;
use serde::{Deserialize, Serialize};

#[derive(Debug, Parser)]
#[command(name = "easyimmerse-server", version, about = "The easyImmerse server")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Command,
}

#[derive(Debug, Subcommand)]
pub enum Command {
    /// Starts the HTTP server.
    Serve(Box<ServeArgs>),
    /// Manages the accounts in a database, without a running server.
    #[command(subcommand)]
    Users(UsersCommand),
    /// Shows or changes the settings in a config file.
    #[command(subcommand)]
    Config(ConfigCommand),
}

/// Each setting may come from a flag, an environment variable, or the config file,
/// which count in that order.
/// A flag that turns something on cannot turn off what the config file turns on.
#[derive(Debug, Clone, Default, Args)]
pub struct ServeArgs {
    /// A TOML file with the settings below,
    /// under the names the flags have, with underscores for dashes, such as `cache_dir = "cache"`.
    /// Relative paths in it are relative to the file's directory.
    #[arg(long, env = "EASYIMMERSE_CONFIG")]
    pub config: Option<PathBuf>,
    /// The address to listen on.
    /// Defaults to 127.0.0.1:8787, which only this machine can reach;
    /// 0.0.0.0:8787 lets other devices on the network reach the server.
    #[arg(long)]
    pub bind: Option<SocketAddr>,
    /// The launch token, whose holder may do anything.
    /// Without it and without `--accounts`, a random one is generated and printed to standard error.
    #[arg(long, env = "EASYIMMERSE_TOKEN")]
    pub token: Option<String>,
    /// Lets people log in to accounts, which `easyimmerse-server users` creates.
    #[arg(long)]
    pub accounts: bool,
    /// Lets anyone create an account through the API. Needs `--accounts`.
    #[arg(long)]
    pub open_signup: bool,
    /// The SQLite database file,
    /// or `:memory:` for a database that lives only while the server runs, which is the default.
    #[arg(long)]
    pub db: Option<PathBuf>,
    /// Lets requests name files on this machine.
    #[arg(long)]
    pub allow_local_paths: bool,
    /// Inserts two example projects into an empty database.
    #[arg(long)]
    pub seed_placeholders: bool,
    /// Gives the example projects a sample video with subtitles, and imports small dictionaries,
    /// all from the fixtures of the repository this server was built from.
    /// Runs once per database.
    #[arg(long)]
    pub seed_sample_content: bool,
    /// Where converted media is cached. Without it, media is never converted.
    #[arg(long, env = "EASYIMMERSE_CACHE_DIR")]
    pub cache_dir: Option<PathBuf>,
    /// Where installed plugins live, one package per subdirectory.
    /// Without it, or when the directory is missing, no plugin is installed.
    #[arg(long, env = "EASYIMMERSE_PLUGINS_DIR")]
    pub plugins_dir: Option<PathBuf>,
    /// Where media-source plugins put the media they fetch.
    /// Without it, media cannot be added through a plugin.
    #[arg(long, env = "EASYIMMERSE_MEDIA_DIR")]
    pub media_dir: Option<PathBuf>,
    /// The directory holding the `ffmpeg` and `ffprobe` that the server uses to read and convert media.
    /// Without it, they are looked for next to the server's executable and then on `PATH`.
    #[arg(long, env = "EASYIMMERSE_FFMPEG_DIR")]
    pub ffmpeg_dir: Option<PathBuf>,
    /// A `Host` header value clients will send, such as `192.168.1.5:8787`.
    /// Needed when the server is bound to `0.0.0.0` or `[::]`.
    /// May be repeated.
    #[arg(long = "expected-host")]
    pub expected_hosts: Vec<String>,
    /// The directory holding the built web app,
    /// which the server then serves at every address the API does not use.
    /// Without it, the server serves the directory named `web` next to its executable, when there is one.
    #[arg(long)]
    pub web_app_dir: Option<PathBuf>,
    /// Serves only the API, even when there is a web app directory.
    #[arg(long)]
    pub api_only: bool,
    /// Where the server keeps the copies of media files that people upload, so that the media
    /// plays on each of their devices. Without it, a server with accounts keeps no copies, and one
    /// without accounts keeps them in the `uploads` subdirectory of `--media-dir`, when that is set.
    #[arg(long, env = "EASYIMMERSE_UPLOADS_DIR")]
    pub uploads_dir: Option<PathBuf>,
    /// The most megabytes of copies each privileged account and administrator may keep, a
    /// megabyte being 1,000,000 bytes. Without it they may keep any amount.
    #[arg(long)]
    pub upload_quota_mb: Option<u64>,
    /// The most megabytes of copies each library user may keep. Without it, library users keep none.
    #[arg(long)]
    pub library_user_upload_quota_mb: Option<u64>,
    /// The SMTP server that sends the mail of accounts, which confirms their addresses and resets
    /// forgotten passwords. Needs `--accounts`, `--mail-from` and `--public-url`.
    #[arg(long)]
    pub smtp_host: Option<String>,
    /// The port of the SMTP server. Defaults to 465 with `--smtp-security tls`, 587 with `starttls`,
    /// and 25 with `none`.
    #[arg(long)]
    pub smtp_port: Option<u16>,
    /// The user name to log in to the SMTP server with. The password is read from
    /// `EASYIMMERSE_SMTP_PASSWORD`.
    #[arg(long)]
    pub smtp_user: Option<String>,
    /// How the connection to the SMTP server is encrypted. Defaults to `starttls`.
    #[arg(long, value_enum)]
    pub smtp_security: Option<SmtpSecurityArg>,
    /// The address mail is sent from, such as `accounts@example.com`.
    #[arg(long)]
    pub mail_from: Option<String>,
    /// Where the web app that opens mailed links is reachable, such as `https://example.com`.
    /// Needed whenever the server sends mail.
    #[arg(long)]
    pub public_url: Option<String>,
    /// Writes each mail to standard error instead of sending it, for development. Needs
    /// `--accounts` and `--public-url`.
    #[arg(long)]
    pub mail_to_stderr: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, ValueEnum, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SmtpSecurityArg {
    /// TLS from the start.
    Tls,
    /// A plain connection that must be upgraded with STARTTLS.
    Starttls,
    /// No encryption, for a relay on the same machine or network.
    None,
}

#[derive(Debug, Subcommand)]
pub enum ConfigCommand {
    /// Prints the config file's path and the settings that `serve` would use without flags.
    Show(ConfigFileArgs),
    /// Writes one setting into the config file, creating the file when it is missing.
    Set(ConfigSetArgs),
}

#[derive(Debug, Args)]
pub struct ConfigFileArgs {
    /// The config file.
    #[arg(long, env = "EASYIMMERSE_CONFIG")]
    pub config: Option<PathBuf>,
}

#[derive(Debug, Args)]
pub struct ConfigSetArgs {
    /// A setting's name as the config file spells it, such as `bind` or `desktop.autostart`.
    pub key: String,
    /// The new value. `expected_hosts` takes a comma-separated list.
    pub value: String,
    #[command(flatten)]
    pub file: ConfigFileArgs,
}

#[derive(Debug, Subcommand)]
pub enum UsersCommand {
    /// Creates an account.
    /// The password is read from standard input with `--password-stdin`, or else from `EASYIMMERSE_PASSWORD`.
    Create(CreateUserArgs),
    /// Lists every account, oldest first.
    List(DatabaseArgs),
    /// Changes the role of an account.
    SetRole(SetRoleArgs),
    /// Gives an account a new password and ends all of its sessions.
    /// The password is read from standard input with `--password-stdin`, or else from `EASYIMMERSE_PASSWORD`.
    SetPassword(SetPasswordArgs),
    /// Deletes an account together with its sessions.
    Delete(DeleteUserArgs),
}

#[derive(Debug, Args)]
pub struct DatabaseArgs {
    /// The SQLite database file the server uses. It is created when missing.
    #[arg(long)]
    pub db: Option<PathBuf>,
}

impl UsersCommand {
    /// The database the command works on, so that a caller can fill in a default one.
    pub fn database_mut(&mut self) -> &mut DatabaseArgs {
        match self {
            Self::Create(args) => &mut args.database,
            Self::List(args) => args,
            Self::SetRole(args) => &mut args.database,
            Self::SetPassword(args) => &mut args.database,
            Self::Delete(args) => &mut args.database,
        }
    }
}

#[derive(Debug, Args)]
pub struct CreateUserArgs {
    #[command(flatten)]
    pub database: DatabaseArgs,
    #[arg(long)]
    pub email: String,
    /// One of `library_user`, `privileged` and `administrator`.
    #[arg(long)]
    pub role: AccountRole,
    #[command(flatten)]
    pub password: PasswordArgs,
}

#[derive(Debug, Args)]
pub struct SetPasswordArgs {
    #[command(flatten)]
    pub database: DatabaseArgs,
    #[arg(long)]
    pub email: String,
    #[command(flatten)]
    pub password: PasswordArgs,
}

#[derive(Debug, Args)]
pub struct PasswordArgs {
    /// Reads the password from the first line of standard input.
    #[arg(long)]
    pub password_stdin: bool,
}

#[derive(Debug, Args)]
pub struct SetRoleArgs {
    #[command(flatten)]
    pub database: DatabaseArgs,
    #[arg(long)]
    pub email: String,
    /// One of `library_user`, `privileged` and `administrator`.
    #[arg(long)]
    pub role: AccountRole,
}

#[derive(Debug, Args)]
pub struct DeleteUserArgs {
    #[command(flatten)]
    pub database: DatabaseArgs,
    #[arg(long)]
    pub email: String,
}
