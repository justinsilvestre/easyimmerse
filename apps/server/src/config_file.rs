//! The TOML file that holds a server's settings, so that they need not be repeated on the command line.
//! Every key is optional; a flag or an environment variable overrides it.

use std::net::SocketAddr;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigFileError {
    #[error("could not read the config file {path}: {source}")]
    Read {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("the config file {path} is invalid: {source}")]
    Parse {
        path: PathBuf,
        source: toml::de::Error,
    },
}

/// The contents of a config file.
/// The paths are relative to the file's directory
/// until [`ServerFileConfig::resolved_against`] makes them absolute or relative to the working directory.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ServerFileConfig {
    pub bind: Option<SocketAddr>,
    pub token: Option<String>,
    pub accounts: Option<bool>,
    pub open_signup: Option<bool>,
    /// The SQLite database file, or `:memory:`.
    pub db: Option<PathBuf>,
    pub allow_local_paths: Option<bool>,
    pub cache_dir: Option<PathBuf>,
    pub plugins_dir: Option<PathBuf>,
    pub media_dir: Option<PathBuf>,
    /// The directory holding `ffmpeg` and `ffprobe`.
    pub ffmpeg_dir: Option<PathBuf>,
    pub expected_hosts: Option<Vec<String>>,
    pub web_app_dir: Option<PathBuf>,
    pub api_only: Option<bool>,
    /// Settings that only the desktop app reads.
    pub desktop: Option<DesktopFileConfig>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DesktopFileConfig {
    /// Whether the app starts the server that other devices reach when the app starts.
    pub autostart: Option<bool>,
}

/// The name that stands for a database living only in memory instead of in a file.
pub const IN_MEMORY_DATABASE: &str = ":memory:";

impl ServerFileConfig {
    /// Reads the file at `path`, resolving its relative paths against the file's directory.
    pub fn load(path: &Path) -> Result<Self, ConfigFileError> {
        let text = std::fs::read_to_string(path).map_err(|source| ConfigFileError::Read {
            path: path.to_path_buf(),
            source,
        })?;
        Self::parse(&text, path)
    }

    /// Reads the file at `path` like [`ServerFileConfig::load`],
    /// or returns an empty config when there is no such file.
    pub fn load_or_default(path: &Path) -> Result<Self, ConfigFileError> {
        if path.exists() {
            Self::load(path)
        } else {
            Ok(Self::default())
        }
    }

    /// Parses `text` as the contents of the file at `path`.
    pub fn parse(text: &str, path: &Path) -> Result<Self, ConfigFileError> {
        let config: Self = toml::from_str(text).map_err(|source| ConfigFileError::Parse {
            path: path.to_path_buf(),
            source,
        })?;
        Ok(config.resolved_against(path.parent().unwrap_or(Path::new(""))))
    }

    /// Joins every relative path to `dir`. The in-memory database name is left as it is.
    pub fn resolved_against(self, dir: &Path) -> Self {
        let resolve = |path: Option<PathBuf>| path.map(|path| dir.join(path));
        Self {
            db: self
                .db
                .map(|db| if is_in_memory(&db) { db } else { dir.join(db) }),
            cache_dir: resolve(self.cache_dir),
            plugins_dir: resolve(self.plugins_dir),
            media_dir: resolve(self.media_dir),
            ffmpeg_dir: resolve(self.ffmpeg_dir),
            web_app_dir: resolve(self.web_app_dir),
            ..self
        }
    }

    /// Fills each key this config leaves out from `defaults`,
    /// such as the desktop app's own locations for the database and the directories.
    pub fn with_defaults(self, defaults: Self) -> Self {
        Self {
            bind: self.bind.or(defaults.bind),
            token: self.token.or(defaults.token),
            accounts: self.accounts.or(defaults.accounts),
            open_signup: self.open_signup.or(defaults.open_signup),
            db: self.db.or(defaults.db),
            allow_local_paths: self.allow_local_paths.or(defaults.allow_local_paths),
            cache_dir: self.cache_dir.or(defaults.cache_dir),
            plugins_dir: self.plugins_dir.or(defaults.plugins_dir),
            media_dir: self.media_dir.or(defaults.media_dir),
            ffmpeg_dir: self.ffmpeg_dir.or(defaults.ffmpeg_dir),
            expected_hosts: self.expected_hosts.or(defaults.expected_hosts),
            web_app_dir: self.web_app_dir.or(defaults.web_app_dir),
            api_only: self.api_only.or(defaults.api_only),
            desktop: self.desktop.or(defaults.desktop),
        }
    }

    /// Whether the desktop app starts its server for other devices when it starts. False by default.
    pub fn should_autostart(&self) -> bool {
        self.desktop
            .as_ref()
            .and_then(|desktop| desktop.autostart)
            .unwrap_or(false)
    }
}

/// Whether `db` names the database that lives only in memory.
pub fn is_in_memory(db: &Path) -> bool {
    db == Path::new(IN_MEMORY_DATABASE)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(text: &str) -> Result<ServerFileConfig, ConfigFileError> {
        ServerFileConfig::parse(text, Path::new("/srv/easyimmerse/server.toml"))
    }

    #[test]
    fn reads_the_bind_address() {
        let config = parse("bind = \"0.0.0.0:8787\"").unwrap();
        assert_eq!(config.bind, Some("0.0.0.0:8787".parse().unwrap()));
    }

    #[test]
    fn resolves_a_relative_directory_against_the_file_directory() {
        let config = parse("cache_dir = \"cache\"").unwrap();
        assert_eq!(
            config.cache_dir,
            Some(PathBuf::from("/srv/easyimmerse/cache"))
        );
    }

    #[test]
    fn resolves_a_relative_database_against_the_file_directory() {
        let config = parse("db = \"server.sqlite\"").unwrap();
        assert_eq!(
            config.db,
            Some(PathBuf::from("/srv/easyimmerse/server.sqlite"))
        );
    }

    #[test]
    fn keeps_an_absolute_directory() {
        let config = parse("ffmpeg_dir = \"/opt/homebrew/bin\"").unwrap();
        assert_eq!(config.ffmpeg_dir, Some(PathBuf::from("/opt/homebrew/bin")));
    }

    #[test]
    fn keeps_the_in_memory_database_name() {
        let config = parse("db = \":memory:\"").unwrap();
        assert_eq!(config.db, Some(PathBuf::from(IN_MEMORY_DATABASE)));
    }

    #[test]
    fn names_an_unknown_key() {
        let error = parse("bnd = \"0.0.0.0:8787\"").unwrap_err();
        assert!(error.to_string().contains("bnd"));
    }

    #[test]
    fn names_an_unknown_key_in_the_desktop_table() {
        let error = parse("[desktop]\nautostrat = true").unwrap_err();
        assert!(error.to_string().contains("autostrat"));
    }

    #[test]
    fn reads_autostart_from_the_desktop_table() {
        let config = parse("[desktop]\nautostart = true").unwrap();
        assert!(config.should_autostart());
    }

    #[test]
    fn does_not_autostart_by_default() {
        assert!(!parse("").unwrap().should_autostart());
    }

    #[test]
    fn refuses_an_unparsable_bind_address() {
        assert!(parse("bind = \"everywhere\"").is_err());
    }

    #[test]
    fn keeps_its_own_value_over_a_default() {
        let config = ServerFileConfig {
            accounts: Some(false),
            ..ServerFileConfig::default()
        };
        let defaults = ServerFileConfig {
            accounts: Some(true),
            ..ServerFileConfig::default()
        };
        assert_eq!(config.with_defaults(defaults).accounts, Some(false));
    }

    #[test]
    fn takes_a_default_for_a_key_it_leaves_out() {
        let defaults = ServerFileConfig {
            media_dir: Some(PathBuf::from("/data/media")),
            ..ServerFileConfig::default()
        };
        let config = ServerFileConfig::default().with_defaults(defaults);
        assert_eq!(config.media_dir, Some(PathBuf::from("/data/media")));
    }

    #[test]
    fn loads_an_empty_config_when_the_file_is_missing() {
        let dir = tempfile::tempdir().unwrap();
        let config = ServerFileConfig::load_or_default(&dir.path().join("server.toml")).unwrap();
        assert_eq!(config, ServerFileConfig::default());
    }

    #[test]
    fn refuses_to_load_a_missing_file() {
        let dir = tempfile::tempdir().unwrap();
        assert!(ServerFileConfig::load(&dir.path().join("server.toml")).is_err());
    }
}
