use std::net::SocketAddr;
use std::path::PathBuf;

use clap::{Args, Parser, Subcommand};
use easyimmerse_core::account::AccountRole;

#[derive(Debug, Parser)]
#[command(name = "easyimmerse-server", version, about = "The easyImmerse server")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Command,
}

#[derive(Debug, Subcommand)]
pub enum Command {
    /// Starts the HTTP server.
    Serve(ServeArgs),
    /// Manages the accounts in a database, without a running server.
    #[command(subcommand)]
    Users(UsersCommand),
}

#[derive(Debug, Args)]
pub struct ServeArgs {
    /// The address to listen on.
    #[arg(long, default_value = "127.0.0.1:8787")]
    pub bind: SocketAddr,
    /// The launch token, whose holder may do anything. Without it and without `--accounts`,
    /// a random one is generated and printed to standard error.
    #[arg(long, env = "EASYIMMERSE_TOKEN")]
    pub token: Option<String>,
    /// Lets people log in to accounts, which `easyimmerse-server users` creates.
    #[arg(long)]
    pub accounts: bool,
    /// Lets anyone create an account through the API. Needs `--accounts`.
    #[arg(long, requires = "accounts")]
    pub open_signup: bool,
    /// The SQLite database file, or `:memory:` for a database that lives only while the
    /// server runs.
    #[arg(long, default_value = ":memory:")]
    pub db: String,
    /// Lets requests name files on this machine.
    #[arg(long)]
    pub allow_local_paths: bool,
    /// Inserts two example projects into an empty database.
    #[arg(long)]
    pub seed_placeholders: bool,
    /// Gives the example projects a sample video with subtitles, and imports small dictionaries,
    /// all from the fixtures of the repository this server was built from. Runs once per database.
    #[arg(long)]
    pub seed_sample_content: bool,
    /// Where converted media is cached. Without it, media is never converted.
    #[arg(long, env = "EASYIMMERSE_CACHE_DIR")]
    pub cache_dir: Option<PathBuf>,
    /// Where installed plugins live, one package per subdirectory. Without it, or when the
    /// directory is missing, no plugin is installed.
    #[arg(long, env = "EASYIMMERSE_PLUGINS_DIR")]
    pub plugins_dir: Option<PathBuf>,
    /// Where media-source plugins put the media they fetch. Without it, media cannot be
    /// added through a plugin.
    #[arg(long, env = "EASYIMMERSE_MEDIA_DIR")]
    pub media_dir: Option<PathBuf>,
    /// A `Host` header value clients will send, such as `192.168.1.5:8787`. Needed when the
    /// server is bound to `0.0.0.0` or `[::]`. May be repeated.
    #[arg(long = "expected-host")]
    pub expected_hosts: Vec<String>,
}

#[derive(Debug, Subcommand)]
pub enum UsersCommand {
    /// Creates an account. The password is read from standard input with `--password-stdin`,
    /// or else from `EASYIMMERSE_PASSWORD`.
    Create(CreateUserArgs),
    /// Lists every account, oldest first.
    List(DatabaseArgs),
    /// Changes the role of an account.
    SetRole(SetRoleArgs),
    /// Deletes an account together with its sessions.
    Delete(DeleteUserArgs),
}

#[derive(Debug, Args)]
pub struct DatabaseArgs {
    /// The SQLite database file the server uses. It is created when missing.
    #[arg(long)]
    pub db: PathBuf,
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
