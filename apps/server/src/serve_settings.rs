//! The settings a server runs with, merged from the command line, the environment, the
//! config file, and the defaults.

use std::net::{Ipv4Addr, SocketAddr};
use std::path::PathBuf;

use crate::cli::ServeArgs;
use crate::config_file::{ServerFileConfig, is_in_memory};

pub const DEFAULT_BIND: SocketAddr =
    SocketAddr::new(std::net::IpAddr::V4(Ipv4Addr::LOCALHOST), 8787);

/// The directory next to the server's executable that holds the built web app.
pub const WEB_APP_DIR_NAME: &str = "web";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ServeSettings {
    pub bind: SocketAddr,
    /// The launch token. None makes a random one, unless the server has accounts.
    pub token: Option<String>,
    pub accounts: bool,
    pub open_signup: bool,
    /// The database file. None keeps the database in memory.
    pub db: Option<PathBuf>,
    pub allow_local_paths: bool,
    pub seed_placeholders: bool,
    pub seed_sample_content: bool,
    pub cache_dir: Option<PathBuf>,
    pub plugins_dir: Option<PathBuf>,
    pub media_dir: Option<PathBuf>,
    pub ffmpeg_dir: Option<PathBuf>,
    pub expected_hosts: Vec<String>,
    /// The web app directory that was chosen. None looks next to the executable.
    pub web_app_dir: Option<PathBuf>,
    pub api_only: bool,
}

/// Merges the command line, whose values already include the environment variables, over
/// the config file, and fills in the defaults. A list given on the command line replaces the
/// file's list.
pub fn resolve_serve_settings(args: &ServeArgs, file: &ServerFileConfig) -> ServeSettings {
    let flag_or_file = |flag: bool, file: Option<bool>| flag || file.unwrap_or(false);
    let path_or_file =
        |flag: &Option<PathBuf>, file: &Option<PathBuf>| flag.clone().or_else(|| file.clone());
    ServeSettings {
        bind: args.bind.or(file.bind).unwrap_or(DEFAULT_BIND),
        token: args.token.clone().or_else(|| file.token.clone()),
        accounts: flag_or_file(args.accounts, file.accounts),
        open_signup: flag_or_file(args.open_signup, file.open_signup),
        db: path_or_file(&args.db, &file.db).filter(|db| !is_in_memory(db)),
        allow_local_paths: flag_or_file(args.allow_local_paths, file.allow_local_paths),
        seed_placeholders: args.seed_placeholders,
        seed_sample_content: args.seed_sample_content,
        cache_dir: path_or_file(&args.cache_dir, &file.cache_dir),
        plugins_dir: path_or_file(&args.plugins_dir, &file.plugins_dir),
        media_dir: path_or_file(&args.media_dir, &file.media_dir),
        ffmpeg_dir: path_or_file(&args.ffmpeg_dir, &file.ffmpeg_dir),
        expected_hosts: if args.expected_hosts.is_empty() {
            file.expected_hosts.clone().unwrap_or_default()
        } else {
            args.expected_hosts.clone()
        },
        web_app_dir: path_or_file(&args.web_app_dir, &file.web_app_dir),
        api_only: flag_or_file(args.api_only, file.api_only),
    }
}

impl ServeSettings {
    /// The web app directory to serve: none with `api_only`, else the chosen one, else the
    /// `web` directory next to the executable when it exists.
    pub fn web_app_dir_to_serve(&self) -> Option<PathBuf> {
        if self.api_only {
            return None;
        }
        self.web_app_dir
            .clone()
            .or_else(web_app_dir_next_to_executable)
    }
}

fn web_app_dir_next_to_executable() -> Option<PathBuf> {
    let executable = std::env::current_exe().ok()?;
    let dir = executable.parent()?.join(WEB_APP_DIR_NAME);
    dir.is_dir().then_some(dir)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn file_binding(bind: &str) -> ServerFileConfig {
        ServerFileConfig {
            bind: Some(bind.parse().unwrap()),
            ..ServerFileConfig::default()
        }
    }

    #[test]
    fn prefers_the_flag_to_the_file() {
        let args = ServeArgs {
            bind: Some("127.0.0.1:9000".parse().unwrap()),
            ..ServeArgs::default()
        };
        let settings = resolve_serve_settings(&args, &file_binding("0.0.0.0:8787"));
        assert_eq!(settings.bind, "127.0.0.1:9000".parse().unwrap());
    }

    #[test]
    fn prefers_the_file_to_the_default() {
        let settings = resolve_serve_settings(&ServeArgs::default(), &file_binding("0.0.0.0:8787"));
        assert_eq!(settings.bind, "0.0.0.0:8787".parse().unwrap());
    }

    #[test]
    fn falls_back_to_the_default_bind_address() {
        let settings = resolve_serve_settings(&ServeArgs::default(), &ServerFileConfig::default());
        assert_eq!(settings.bind, DEFAULT_BIND);
    }

    #[test]
    fn prefers_a_path_flag_to_the_file() {
        let args = ServeArgs {
            cache_dir: Some(PathBuf::from("/flag/cache")),
            ..ServeArgs::default()
        };
        let file = ServerFileConfig {
            cache_dir: Some(PathBuf::from("/file/cache")),
            ..ServerFileConfig::default()
        };
        assert_eq!(
            resolve_serve_settings(&args, &file).cache_dir,
            Some(PathBuf::from("/flag/cache"))
        );
    }

    #[test]
    fn takes_a_switch_that_the_file_turns_on() {
        let file = ServerFileConfig {
            accounts: Some(true),
            ..ServerFileConfig::default()
        };
        assert!(resolve_serve_settings(&ServeArgs::default(), &file).accounts);
    }

    #[test]
    fn replaces_the_file_hosts_with_the_flag_hosts() {
        let args = ServeArgs {
            expected_hosts: vec!["flag.local:8787".to_string()],
            ..ServeArgs::default()
        };
        let file = ServerFileConfig {
            expected_hosts: Some(vec!["file.local:8787".to_string()]),
            ..ServerFileConfig::default()
        };
        assert_eq!(
            resolve_serve_settings(&args, &file).expected_hosts,
            vec!["flag.local:8787"]
        );
    }

    #[test]
    fn keeps_the_in_memory_database_as_none() {
        let args = ServeArgs {
            db: Some(PathBuf::from(":memory:")),
            ..ServeArgs::default()
        };
        let file = ServerFileConfig {
            db: Some(PathBuf::from("/file/server.sqlite")),
            ..ServerFileConfig::default()
        };
        assert_eq!(resolve_serve_settings(&args, &file).db, None);
    }

    #[test]
    fn serves_no_web_app_with_api_only() {
        let args = ServeArgs {
            web_app_dir: Some(PathBuf::from("/srv/web")),
            api_only: true,
            ..ServeArgs::default()
        };
        let settings = resolve_serve_settings(&args, &ServerFileConfig::default());
        assert_eq!(settings.web_app_dir_to_serve(), None);
    }

    #[test]
    fn serves_the_chosen_web_app_dir() {
        let args = ServeArgs {
            web_app_dir: Some(PathBuf::from("/srv/web")),
            ..ServeArgs::default()
        };
        let settings = resolve_serve_settings(&args, &ServerFileConfig::default());
        assert_eq!(
            settings.web_app_dir_to_serve(),
            Some(PathBuf::from("/srv/web"))
        );
    }
}
