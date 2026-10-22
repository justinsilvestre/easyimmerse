//! The `config set` subcommand, which writes one setting into a config file.

use std::path::Path;

use anyhow::Context;
use thiserror::Error;
use toml_edit::{Array, DocumentMut, Item, value};

use crate::cli::ConfigSetArgs;
use crate::config_file::ServerFileConfig;

const TOKEN_KEY: &str = "token";
#[cfg(unix)]
const OWNER_ONLY_MODE: u32 = 0o600;

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

pub fn set(args: &ConfigSetArgs) -> anyhow::Result<()> {
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
    write_config_file(path, &args.key, &updated)
        .with_context(|| format!("could not write {}", path.display()))?;
    println!("set {} in {}", args.key, path.display());
    if args.key == TOKEN_KEY {
        println!(
            "note: the token is stored in plain text in {}",
            path.display()
        );
    }
    Ok(())
}

/// Writes the file, readable only by its owner on Unix when it is to hold the token.
fn write_config_file(path: &Path, key: &str, text: &str) -> std::io::Result<()> {
    if let Some(directory) = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
    {
        std::fs::create_dir_all(directory)?;
    }
    if key == TOKEN_KEY {
        write_owner_only(path, text)
    } else {
        std::fs::write(path, text)
    }
}

#[cfg(unix)]
fn write_owner_only(path: &Path, text: &str) -> std::io::Result<()> {
    use std::io::Write;
    use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .mode(OWNER_ONLY_MODE)
        .open(path)?;
    // The mode above applies only to a new file, so an existing one is restricted before the token goes in.
    file.set_permissions(std::fs::Permissions::from_mode(OWNER_ONLY_MODE))?;
    file.write_all(text.as_bytes())
}

#[cfg(not(unix))]
fn write_owner_only(path: &Path, text: &str) -> std::io::Result<()> {
    std::fs::write(path, text)
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
        assert!(settings_from(&text).should_autostart());
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

    #[cfg(unix)]
    #[test]
    fn makes_the_file_readable_only_by_its_owner_when_it_holds_the_token() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("server.toml");
        std::fs::write(&path, "").unwrap();
        write_config_file(&path, TOKEN_KEY, "token = \"secret\"\n").unwrap();
        let mode = std::fs::metadata(&path).unwrap().permissions().mode();
        assert_eq!(mode & 0o777, OWNER_ONLY_MODE);
    }

    #[test]
    fn creates_the_directory_of_a_new_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested").join("server.toml");
        write_config_file(&path, "port", "port = 1\n").unwrap();
        assert!(path.exists());
    }
}
