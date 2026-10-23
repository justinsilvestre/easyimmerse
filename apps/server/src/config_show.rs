//! The `config show` subcommand, which prints the config file's path and the effective settings.

use std::path::{Path, PathBuf};

use clap::{Args, FromArgMatches};

use crate::cli::{ConfigFileArgs, ServeArgs};
use crate::config_file::{IN_MEMORY_DATABASE, ServerFileConfig};
use crate::serve_settings::{ServeSettings, resolve_serve_settings};

/// Prints the config file's path and one line per setting,
/// showing each setting that the config file leaves out as it is in `defaults`.
pub fn show(args: &ConfigFileArgs, defaults: &ServerFileConfig) -> anyhow::Result<()> {
    let file = match &args.config {
        Some(path) => ServerFileConfig::load_or_default(path)?,
        None => ServerFileConfig::default(),
    }
    .with_defaults(defaults.clone());
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
        format!("uploads_dir = {}", path(&settings.uploads_dir)),
        format!("upload_quota_mb = {}", optional(&settings.upload_quota_mb)),
        format!(
            "library_user_upload_quota_mb = {}",
            optional(&settings.library_user_upload_quota_mb)
        ),
        format!("smtp_host = {}", optional(&settings.smtp_host)),
        format!("smtp_port = {}", optional(&settings.smtp_port)),
        format!("smtp_user = {}", optional(&settings.smtp_user)),
        format!(
            "smtp_security = {}",
            optional(
                &settings
                    .smtp_security
                    .map(|security| format!("{security:?}").to_lowercase())
            )
        ),
        format!("mail_from = {}", optional(&settings.mail_from)),
        format!("public_url = {}", optional(&settings.public_url)),
        format!("mail_to_stderr = {}", settings.mail_to_stderr),
        format!("desktop.autostart = {}", file.should_autostart()),
        format!(
            "desktop.device_name = {}",
            optional(&file.device_name())
        ),
    ]
}

fn optional(value: &Option<impl std::fmt::Display>) -> String {
    value
        .as_ref()
        .map_or("none".to_string(), |value| value.to_string())
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn describes_a_missing_token_without_accounts_as_random() {
        let settings = resolve_serve_settings(&ServeArgs::default(), &ServerFileConfig::default());
        assert_eq!(describe_token(&settings), "a random one at each start");
    }

    #[test]
    fn does_not_show_the_token() {
        let file = ServerFileConfig::parse("token = \"secret\"", Path::new("server.toml")).unwrap();
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
        let expected = format!("cache_dir = {}", Path::new("/srv").join("cache").display());
        assert!(describe_settings(&settings, &file).contains(&expected));
    }
}
