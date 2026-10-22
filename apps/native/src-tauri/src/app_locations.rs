//! Finds the directories the app keeps its config, data and cache in, and its built web app.
//! A debug build opens the database named by `EASYIMMERSE_DATABASE` instead, when it is set,
//! and keeps the plugins and fetched media beside it.

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::server_settings::AppLocations;

const DATABASE_OVERRIDE_VARIABLE: &str = "EASYIMMERSE_DATABASE";
/// The resource that holds the built web app in a bundled app.
const WEB_APP_RESOURCE: &str = "web";
/// Where a debug build finds the web app, relative to the repository root.
const WEB_APP_BUILD_DIR: &str = "apps/web/dist";

/// The locations Tauri gives the running app.
/// Only the server config file lives in the config directory, and the app starts without it,
/// so the data directory stands in when the config directory cannot be found.
pub fn from_app(app: &AppHandle) -> tauri::Result<AppLocations> {
    let path = app.path();
    let data_dir = path.app_data_dir()?;
    let config_dir = path.app_config_dir().unwrap_or_else(|error| {
        tracing::warn!("could not find the app config directory: {error}");
        data_dir.clone()
    });
    Ok(locations(
        config_dir,
        data_dir,
        path.app_cache_dir()?,
        path.resource_dir().ok(),
    ))
}

/// The same locations as [`from_app`], found without starting the app,
/// which the command line needs since it runs without a window.
/// They agree as long as the Tauri config overrides none of the app's directories.
#[cfg(desktop)]
pub fn from_context(context: &tauri::Context<tauri::Wry>) -> Option<AppLocations> {
    let identifier = &context.config().identifier;
    let resource_dir =
        tauri::utils::platform::resource_dir(context.package_info(), &tauri::Env::default()).ok();
    Some(locations(
        dirs::config_dir()?.join(identifier),
        dirs::data_dir()?.join(identifier),
        dirs::cache_dir()?.join(identifier),
        resource_dir,
    ))
}

fn locations(
    config_dir: PathBuf,
    data_dir: PathBuf,
    cache_dir: PathBuf,
    resource_dir: Option<PathBuf>,
) -> AppLocations {
    let database_override = read_database_override();
    let data_dir = database_override
        .as_deref()
        .and_then(Path::parent)
        .map_or(data_dir, Path::to_path_buf);
    AppLocations {
        config_dir,
        data_dir,
        cache_dir,
        web_app_dir: web_app_dir(resource_dir).filter(|dir| dir.is_dir()),
        database_override,
    }
}

/// A release build serves the web app bundled as a resource,
/// and a debug build the one built in the repository.
fn web_app_dir(resource_dir: Option<PathBuf>) -> Option<PathBuf> {
    if cfg!(debug_assertions) {
        Some(repository_root().join(WEB_APP_BUILD_DIR))
    } else {
        resource_dir.map(|dir| dir.join(WEB_APP_RESOURCE))
    }
}

pub fn repository_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../..")
}

/// Reads the database path a developer chose, which release builds ignore.
fn read_database_override() -> Option<PathBuf> {
    if !cfg!(debug_assertions) {
        return None;
    }
    let value = std::env::var_os(DATABASE_OVERRIDE_VARIABLE)?;
    resolve_database_override(&value, &repository_root())
}

/// Resolves a chosen database path, reading a relative path from the repository root.
/// An empty value chooses nothing.
fn resolve_database_override(value: &std::ffi::OsStr, repository_root: &Path) -> Option<PathBuf> {
    if value.is_empty() {
        return None;
    }
    Some(repository_root.join(value))
}

#[cfg(test)]
mod tests {
    use std::ffi::OsStr;

    use super::*;

    #[test]
    fn reads_a_relative_path_from_the_repository_root() {
        let path = resolve_database_override(OsStr::new(".dev/a.sqlite"), Path::new("/repo"));
        assert_eq!(path, Some(PathBuf::from("/repo/.dev/a.sqlite")));
    }

    #[test]
    fn keeps_an_absolute_path() {
        let path = resolve_database_override(OsStr::new("/tmp/a.sqlite"), Path::new("/repo"));
        assert_eq!(path, Some(PathBuf::from("/tmp/a.sqlite")));
    }

    #[test]
    fn chooses_nothing_for_an_empty_value() {
        let path = resolve_database_override(OsStr::new(""), Path::new("/repo"));
        assert_eq!(path, None);
    }
}
