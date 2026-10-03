use std::net::SocketAddr;

use clap::{Args, Parser, Subcommand};

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
}

#[derive(Debug, Args)]
pub struct ServeArgs {
    /// The address to listen on.
    #[arg(long, default_value = "127.0.0.1:8787")]
    pub bind: SocketAddr,
    /// The bearer token clients must present. A random one is generated and printed to
    /// standard error when absent.
    #[arg(long, env = "EASYIMMERSE_TOKEN")]
    pub token: Option<String>,
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
    /// A `Host` header value clients will send, such as `192.168.1.5:8787`. Needed when the
    /// server is bound to `0.0.0.0` or `[::]`. May be repeated.
    #[arg(long = "expected-host")]
    pub expected_hosts: Vec<String>,
}
