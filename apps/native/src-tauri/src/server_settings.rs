//! The desktop app's server config file, its defaults, and the settings the webview edits.

use std::net::{Ipv4Addr, SocketAddr};
use std::path::{Path, PathBuf};

use easyimmerse_api::server_control::{DesktopServerSettings, ServerAuthMode};
use easyimmerse_server::cli::ServeArgs;
use easyimmerse_server::config_command::{ConfigSetError, set_value};
use easyimmerse_server::config_file::{DesktopFileConfig, ServerFileConfig};
use easyimmerse_server::serve_settings::{ServeSettings, resolve_serve_settings};
use thiserror::Error;

use crate::server_addresses::default_device_name;

pub const CONFIG_FILE_NAME: &str = "server.toml";
/// Every network interface, so that other devices can reach the server once it is started.
pub const DEFAULT_PUBLIC_BIND: SocketAddr =
    SocketAddr::new(std::net::IpAddr::V4(Ipv4Addr::UNSPECIFIED), 8787);
const DATABASE_FILE_NAME: &str = "easyimmerse.sqlite";
/// The directories beside the database that hold installed plugins and the media they fetch.
const PLUGINS_DIR_NAME: &str = "plugins";
const MEDIA_DIR_NAME: &str = "media";

#[derive(Debug, Error)]
pub enum SettingsError {
    #[error(transparent)]
    Invalid(#[from] ConfigSetError),
    #[error("open signup needs the accounts mode")]
    OpenSignupNeedsAccounts,
}

/// Where the app keeps its files, which become the defaults of its server config file.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppLocations {
    pub config_dir: PathBuf,
    pub data_dir: PathBuf,
    pub cache_dir: PathBuf,
    /// The built web app, when the app has one.
    pub web_app_dir: Option<PathBuf>,
    /// A database that wins over the config file's, which only debug builds choose.
    pub database_override: Option<PathBuf>,
}

impl AppLocations {
    pub fn config_path(&self) -> PathBuf {
        self.config_dir.join(CONFIG_FILE_NAME)
    }

    /// The settings the app uses for each key its config file leaves out.
    pub fn defaults(&self) -> ServerFileConfig {
        ServerFileConfig {
            bind: Some(DEFAULT_PUBLIC_BIND),
            accounts: Some(false),
            open_signup: Some(false),
            db: Some(self.data_dir.join(DATABASE_FILE_NAME)),
            allow_local_paths: Some(true),
            cache_dir: Some(self.cache_dir.clone()),
            plugins_dir: Some(self.data_dir.join(PLUGINS_DIR_NAME)),
            media_dir: Some(self.data_dir.join(MEDIA_DIR_NAME)),
            web_app_dir: self.web_app_dir.clone(),
            api_only: Some(false),
            desktop: Some(DesktopFileConfig {
                autostart: Some(false),
                device_name: default_device_name(),
            }),
            ..ServerFileConfig::default()
        }
    }

    /// The config file's settings completed with the app's defaults.
    pub fn complete(&self, file: ServerFileConfig) -> ServerFileConfig {
        let mut completed = file.with_defaults(self.defaults());
        if let Some(database) = &self.database_override {
            completed.db = Some(database.clone());
        }
        completed
    }
}

/// The settings the embedded server runs with:
/// the completed config file, with the app's launch token in place of any token the file names.
/// Debug builds seed an empty database,
/// since the schema still changes often and a developer then deletes the database to start over.
pub fn serve_settings(completed: &ServerFileConfig, token: &str) -> ServeSettings {
    ServeSettings {
        token: Some(token.to_string()),
        device_name: completed
            .device_name()
            .map(str::trim)
            .filter(|name| !name.is_empty())
            .map(str::to_string),
        seed_placeholders: cfg!(debug_assertions),
        seed_sample_content: cfg!(debug_assertions),
        ..resolve_serve_settings(&ServeArgs::default(), completed)
    }
}

/// Whether the server serves the web app with these settings.
pub fn serves_web_app(settings: &ServeSettings) -> bool {
    settings
        .web_app_dir_to_serve()
        .is_some_and(|dir| dir.is_dir())
}

/// The settings the webview shows.
pub fn desktop_settings(
    settings: &ServeSettings,
    completed: &ServerFileConfig,
) -> DesktopServerSettings {
    DesktopServerSettings {
        bind: settings.bind.to_string(),
        auth: if settings.accounts {
            ServerAuthMode::Accounts
        } else {
            ServerAuthMode::LaunchToken
        },
        open_signup: settings.open_signup,
        api_only: settings.api_only,
        autostart: completed.should_autostart(),
        ffmpeg_dir: settings
            .ffmpeg_dir
            .as_deref()
            .map(|dir| dir.to_string_lossy().into_owned()),
        expected_hosts: settings.expected_hosts.clone(),
        device_name: completed.device_name().unwrap_or_default().to_string(),
    }
}

/// Whether going from `old` to `new` changes how the server runs,
/// rather than only whether it starts with the app.
pub fn needs_restart(old: &DesktopServerSettings, new: &DesktopServerSettings) -> bool {
    let without_autostart = |settings: &DesktopServerSettings| DesktopServerSettings {
        autostart: false,
        ..settings.clone()
    };
    without_autostart(old) != without_autostart(new)
}

/// Returns the config file `text` with the keys the webview edits set to `settings`,
/// keeping every other key, comment and blank line.
pub fn file_text_with(
    text: &str,
    settings: &DesktopServerSettings,
) -> Result<String, SettingsError> {
    let accounts = settings.auth == ServerAuthMode::Accounts;
    if settings.open_signup && !accounts {
        return Err(SettingsError::OpenSignupNeedsAccounts);
    }
    let values = [
        ("bind", settings.bind.trim().to_string()),
        ("accounts", accounts.to_string()),
        ("open_signup", settings.open_signup.to_string()),
        ("api_only", settings.api_only.to_string()),
        ("expected_hosts", settings.expected_hosts.join(",")),
        ("desktop.autostart", settings.autostart.to_string()),
        (
            "desktop.device_name",
            settings.device_name.trim().to_string(),
        ),
    ];
    let mut updated = text.to_string();
    for (key, value) in values {
        updated = set_value(&updated, key, &value)?;
    }
    match &settings.ffmpeg_dir {
        Some(dir) => Ok(set_value(&updated, "ffmpeg_dir", dir)?),
        None => Ok(without_key(&updated, "ffmpeg_dir")),
    }
}

/// Returns `text`, which `set_value` has already parsed, without the top-level `key`.
fn without_key(text: &str, key: &str) -> String {
    match text.parse::<toml_edit::DocumentMut>() {
        Ok(mut document) => {
            document.remove(key);
            document.to_string()
        }
        Err(_) => text.to_string(),
    }
}

/// Reads the config file at `path` as it is on disk, which is empty when there is none.
pub fn read_file_text(path: &Path) -> std::io::Result<String> {
    match std::fs::read_to_string(path) {
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        result => result,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn locations() -> AppLocations {
        AppLocations {
            config_dir: PathBuf::from("/config"),
            data_dir: PathBuf::from("/data"),
            cache_dir: PathBuf::from("/cache"),
            web_app_dir: None,
            database_override: None,
        }
    }

    fn parse(text: &str) -> ServerFileConfig {
        ServerFileConfig::parse(text, Path::new("/config/server.toml")).unwrap()
    }

    fn settings_from(text: &str) -> DesktopServerSettings {
        let completed = locations().complete(parse(text));
        desktop_settings(&serve_settings(&completed, "token"), &completed)
    }

    fn saved(settings: &DesktopServerSettings) -> DesktopServerSettings {
        settings_from(&file_text_with("", settings).unwrap())
    }

    fn default_settings() -> DesktopServerSettings {
        settings_from("")
    }

    #[test]
    fn binds_every_interface_by_default() {
        assert_eq!(default_settings().bind, "0.0.0.0:8787");
    }

    #[test]
    fn keeps_the_database_in_the_data_directory_by_default() {
        let completed = locations().complete(ServerFileConfig::default());
        assert_eq!(
            completed.db,
            Some(PathBuf::from("/data/easyimmerse.sqlite"))
        );
    }

    #[test]
    fn lets_requests_name_local_files_by_default() {
        let completed = locations().complete(ServerFileConfig::default());
        assert!(serve_settings(&completed, "token").allow_local_paths);
    }

    #[test]
    fn prefers_the_database_override_to_the_file() {
        let mut locations = locations();
        locations.database_override = Some(PathBuf::from("/repo/.dev/a.sqlite"));
        let completed = locations.complete(parse("db = \"other.sqlite\""));
        assert_eq!(completed.db, Some(PathBuf::from("/repo/.dev/a.sqlite")));
    }

    #[test]
    fn uses_the_launch_token_instead_of_the_file_token() {
        let completed = locations().complete(parse("token = \"from-file\""));
        assert_eq!(
            serve_settings(&completed, "launch").token,
            Some("launch".to_string())
        );
    }

    #[test]
    fn reads_the_accounts_mode() {
        assert_eq!(
            settings_from("accounts = true").auth,
            ServerAuthMode::Accounts
        );
    }

    #[test]
    fn reads_autostart_from_the_desktop_table() {
        assert!(settings_from("[desktop]\nautostart = true").autostart);
    }

    #[test]
    fn reads_the_ffmpeg_directory() {
        let settings = settings_from("ffmpeg_dir = \"/opt/homebrew/bin\"");
        assert_eq!(settings.ffmpeg_dir, Some("/opt/homebrew/bin".to_string()));
    }

    #[test]
    fn saves_settings_that_read_back_the_same() {
        let settings = DesktopServerSettings {
            bind: "127.0.0.1:9000".to_string(),
            auth: ServerAuthMode::Accounts,
            open_signup: true,
            api_only: true,
            autostart: true,
            ffmpeg_dir: Some("/opt/homebrew/bin".to_string()),
            expected_hosts: vec!["books.example.org".to_string()],
            device_name: "Studio iMac".to_string(),
        };
        assert_eq!(saved(&settings), settings);
    }

    #[test]
    fn removes_the_ffmpeg_directory_to_use_the_bundled_build() {
        let text = file_text_with("ffmpeg_dir = \"/opt/homebrew/bin\"\n", &default_settings());
        assert!(!text.unwrap().contains("ffmpeg_dir"));
    }

    #[test]
    fn keeps_the_keys_it_does_not_edit() {
        let text = file_text_with("cache_dir = \"/big/cache\"\n", &default_settings()).unwrap();
        assert_eq!(parse(&text).cache_dir, Some(PathBuf::from("/big/cache")));
    }

    #[test]
    fn refuses_open_signup_without_accounts() {
        let settings = DesktopServerSettings {
            open_signup: true,
            ..default_settings()
        };
        assert!(matches!(
            file_text_with("", &settings),
            Err(SettingsError::OpenSignupNeedsAccounts)
        ));
    }

    #[test]
    fn refuses_an_unparsable_bind_address() {
        let settings = DesktopServerSettings {
            bind: "everywhere".to_string(),
            ..default_settings()
        };
        assert!(file_text_with("", &settings).is_err());
    }

    #[test]
    fn gives_the_server_the_device_name() {
        let completed = locations().complete(parse("[desktop]\ndevice_name = \"Studio iMac\""));
        assert_eq!(
            serve_settings(&completed, "token").device_name,
            Some("Studio iMac".to_string())
        );
    }

    #[test]
    fn gives_the_server_no_blank_device_name() {
        let completed = locations().complete(parse("[desktop]\ndevice_name = \" \""));
        assert_eq!(serve_settings(&completed, "token").device_name, None);
    }

    #[test]
    fn does_not_restart_for_autostart_alone() {
        let new = DesktopServerSettings {
            autostart: true,
            ..default_settings()
        };
        assert!(!needs_restart(&default_settings(), &new));
    }

    #[test]
    fn restarts_for_a_new_bind_address() {
        let new = DesktopServerSettings {
            bind: "0.0.0.0:9000".to_string(),
            ..default_settings()
        };
        assert!(needs_restart(&default_settings(), &new));
    }
}
