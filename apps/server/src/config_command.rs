//! The `config` subcommands, which show and change the settings in a config file.

use std::path::{Path, PathBuf};

use anyhow::Context;
use clap::{Args, FromArgMatches};
use thiserror::Error;
use toml_edit::{Array, DocumentMut, Item, value};

use crate::cli::{ConfigCommand, ConfigFileArgs, ConfigSetArgs, ServeArgs};
use crate::config_file::{IN_MEMORY_DATABASE, ServerFileConfig};
use crate::serve_settings::{ServeSettings, resolve_serve_settings};

#[derive(Debug, Error)]
pub enum ConfigSetError {
    #[error("there is no setting named `{key}`; the settings are {}", key_names())]
    UnknownKey { key: String },
    #[error("`{value}` is not a valid value for `{key}`: {reason}")]
    InvalidValue {
        key: String,
        value: String,
        reason: String,
    },
    #[error("the config file is not valid TOML: {0}")]
    Unreadable(#[from] toml_edit::TomlError),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ValueKind {
    Text,
    Switch,
    TextList,
}

/// The settings `config set` writes, by the names the config file gives them.
const KEYS: [(&str, ValueKind); 14] = [
    ("bind", ValueKind::Text),
    ("token", ValueKind::Text),
    ("accounts", ValueKind::Switch),
    ("open_signup", ValueKind::Switch),
    ("db", ValueKind::Text),
    ("allow_local_paths", ValueKind::Switch),
    ("cache_dir", ValueKind::Text),
    ("plugins_dir", ValueKind::Text),
    ("media_dir", ValueKind::Text),
    ("ffmpeg_dir", ValueKind::Text),
    ("expected_hosts", ValueKind::TextList),
    ("web_app_dir", ValueKind::Text),
    ("api_only", ValueKind::Switch),
    ("desktop.autostart", ValueKind::Switch),
];

pub fn run(command: ConfigCommand) -> anyhow::Result<()> {
    match command {
        ConfigCommand::Show(args) => show(&args),
        ConfigCommand::Set(args) => set(&args),
    }
}

fn show(args: &ConfigFileArgs) -> anyhow::Result<()> {
    let file = match &args.config {
        Some(path) => ServerFileConfig::load_or_default(path)?,
        None => ServerFileConfig::default(),
    };
    let mut settings = resolve_serve_settings(&serve_args_from_environment()?, &file);
    settings.web_app_dir = settings.web_app_dir_to_serve();
    println!("{}", describe_config_file(args.config.as_deref()));
    for line in describe_settings(&settings, &file) {
        println!("{line}");
    }
    Ok(())
}

/// The `serve` arguments as they are without flags, which holds the environment variables.
fn serve_args_from_environment() -> anyhow::Result<ServeArgs> {
    let matches =
        ServeArgs::augment_args(clap::Command::new("serve")).try_get_matches_from(["serve"])?;
    Ok(ServeArgs::from_arg_matches(&matches)?)
}

fn describe_config_file(path: Option<&Path>) -> String {
    match path {
        Some(path) if path.exists() => format!("config file: {}", path.display()),
        Some(path) => format!("config file: {} (not created yet)", path.display()),
        None => "config file: none (pass --config or set EASYIMMERSE_CONFIG)".to_string(),
    }
}

/// One line per setting, in the order of the config file's keys. The token's value is not shown.
fn describe_settings(settings: &ServeSettings, file: &ServerFileConfig) -> Vec<String> {
    let path = |path: &Option<PathBuf>| {
        path.as_ref()
            .map_or("none".to_string(), |path| path.display().to_string())
    };
    vec![
        format!("bind = {}", settings.bind),
        format!("token = {}", describe_token(settings)),
        format!("accounts = {}", settings.accounts),
        format!("open_signup = {}", settings.open_signup),
        format!(
            "db = {}",
            settings
                .db
                .as_ref()
                .map_or(IN_MEMORY_DATABASE.to_string(), |db| db
                    .display()
                    .to_string())
        ),
        format!("allow_local_paths = {}", settings.allow_local_paths),
        format!("cache_dir = {}", path(&settings.cache_dir)),
        format!("plugins_dir = {}", path(&settings.plugins_dir)),
        format!("media_dir = {}", path(&settings.media_dir)),
        format!("ffmpeg_dir = {}", path(&settings.ffmpeg_dir)),
        format!(
            "expected_hosts = {}",
            describe_hosts(&settings.expected_hosts)
        ),
        format!("web_app_dir = {}", path(&settings.web_app_dir)),
        format!("api_only = {}", settings.api_only),
        format!("desktop.autostart = {}", file.autostarts()),
    ]
}

fn describe_hosts(hosts: &[String]) -> String {
    if hosts.is_empty() {
        "none".to_string()
    } else {
        hosts.join(", ")
    }
}

fn describe_token(settings: &ServeSettings) -> &'static str {
    match (&settings.token, settings.accounts) {
        (Some(_), _) => "set",
        (None, false) => "a random one at each start",
        (None, true) => "none, so only accounts can log in",
    }
}

fn set(args: &ConfigSetArgs) -> anyhow::Result<()> {
    let path = args
        .file
        .config
        .as_deref()
        .context("name the config file with --config or EASYIMMERSE_CONFIG")?;
    let text = match std::fs::read_to_string(path) {
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => String::new(),
        result => result.with_context(|| format!("could not read {}", path.display()))?,
    };
    let updated = set_value(&text, &args.key, &args.value)?;
    std::fs::write(path, updated).with_context(|| format!("could not write {}", path.display()))?;
    println!("set {} in {}", args.key, path.display());
    Ok(())
}

/// Returns the config file `text` with `key` set to `value`, keeping its comments and layout.
/// Refuses a key the file cannot hold and a value the server could not read.
pub fn set_value(text: &str, key: &str, value: &str) -> Result<String, ConfigSetError> {
    let kind = kind_of(key).ok_or_else(|| ConfigSetError::UnknownKey {
        key: key.to_string(),
    })?;
    let item =
        item_for(kind, value).ok_or_else(|| invalid(key, value, "expected true or false"))?;
    let mut document = text.parse::<DocumentMut>()?;
    match key.split_once('.') {
        Some((table, key)) => {
            if !document.contains_key(table) {
                document[table] = toml_edit::table();
            }
            document[table][key] = item;
        }
        None => document[key] = item,
    }
    let updated = document.to_string();
    toml::from_str::<ServerFileConfig>(&updated)
        .map_err(|error| invalid(key, value, error.message()))?;
    Ok(updated)
}

fn kind_of(key: &str) -> Option<ValueKind> {
    KEYS.iter()
        .find(|(name, _)| *name == key)
        .map(|(_, kind)| *kind)
}

fn item_for(kind: ValueKind, text: &str) -> Option<Item> {
    match kind {
        ValueKind::Text => Some(value(text)),
        ValueKind::Switch => text.parse::<bool>().ok().map(value),
        ValueKind::TextList => {
            let entries = text
                .split(',')
                .map(str::trim)
                .filter(|entry| !entry.is_empty());
            Some(value(entries.collect::<Array>()))
        }
    }
}

fn invalid(key: &str, value: &str, reason: &str) -> ConfigSetError {
    ConfigSetError::InvalidValue {
        key: key.to_string(),
        value: value.to_string(),
        reason: reason.to_string(),
    }
}

fn key_names() -> String {
    KEYS.map(|(name, _)| name).join(", ")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings_from(text: &str) -> ServerFileConfig {
        ServerFileConfig::parse(text, Path::new("server.toml")).unwrap()
    }

    #[test]
    fn writes_a_key_into_an_empty_file() {
        let text = set_value("", "bind", "0.0.0.0:8787").unwrap();
        assert_eq!(
            settings_from(&text).bind,
            Some("0.0.0.0:8787".parse().unwrap())
        );
    }

    #[test]
    fn replaces_an_existing_value() {
        let text = set_value("accounts = false\n", "accounts", "true").unwrap();
        assert_eq!(settings_from(&text).accounts, Some(true));
    }

    #[test]
    fn keeps_the_comments_of_the_file() {
        let text = set_value("# my server\naccounts = false\n", "accounts", "true").unwrap();
        assert!(text.starts_with("# my server\n"));
    }

    #[test]
    fn writes_autostart_into_the_desktop_table() {
        let text = set_value("", "desktop.autostart", "true").unwrap();
        assert!(settings_from(&text).autostarts());
    }

    #[test]
    fn writes_autostart_as_a_desktop_table_section() {
        let text = set_value("", "desktop.autostart", "true").unwrap();
        assert!(text.contains("[desktop]"));
    }

    #[test]
    fn writes_a_list_of_hosts() {
        let text = set_value("", "expected_hosts", "a.local:8787, b.local:8787").unwrap();
        assert_eq!(
            settings_from(&text).expected_hosts,
            Some(vec!["a.local:8787".to_string(), "b.local:8787".to_string()])
        );
    }

    #[test]
    fn refuses_an_unknown_key() {
        assert!(matches!(
            set_value("", "bnd", "0.0.0.0:8787"),
            Err(ConfigSetError::UnknownKey { .. })
        ));
    }

    #[test]
    fn refuses_a_switch_that_is_not_true_or_false() {
        assert!(matches!(
            set_value("", "accounts", "yes"),
            Err(ConfigSetError::InvalidValue { .. })
        ));
    }

    #[test]
    fn refuses_an_unparsable_bind_address() {
        assert!(matches!(
            set_value("", "bind", "everywhere"),
            Err(ConfigSetError::InvalidValue { .. })
        ));
    }

    #[test]
    fn describes_a_missing_token_without_accounts_as_random() {
        let settings = resolve_serve_settings(&ServeArgs::default(), &ServerFileConfig::default());
        assert_eq!(describe_token(&settings), "a random one at each start");
    }

    #[test]
    fn does_not_show_the_token() {
        let file = settings_from("token = \"secret\"");
        let settings = resolve_serve_settings(&ServeArgs::default(), &file);
        assert!(
            !describe_settings(&settings, &file)
                .concat()
                .contains("secret")
        );
    }

    #[test]
    fn shows_the_resolved_cache_dir() {
        let file = ServerFileConfig::parse("cache_dir = \"cache\"", Path::new("/srv/server.toml"))
            .unwrap();
        let settings = resolve_serve_settings(&ServeArgs::default(), &file);
        assert!(
            describe_settings(&settings, &file).contains(&"cache_dir = /srv/cache".to_string())
        );
    }
}
