//! Types exchanged between the desktop app's webview and its Tauri commands to configure,
//! observe, and read the logs of the embedded server.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// The embedded server's user-editable configuration.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct DesktopServerSettings {
    /// The socket address the public listener binds to, such as `0.0.0.0:8787`.
    pub bind: String,
    pub auth: ServerAuthMode,
    /// Whether anyone who can reach the server may create an account.
    pub open_signup: bool,
    /// Whether to serve only the API and not the web app.
    pub api_only: bool,
    /// Whether to start the public listener when the app launches.
    pub autostart: bool,
    /// A directory containing the ffmpeg programs to use, or `None` for the bundled ones.
    pub ffmpeg_dir: Option<String>,
    /// Host names that other devices use to reach the server, beyond its own addresses.
    pub expected_hosts: Vec<String>,
    /// The name paired devices show for this computer, such as `X's MacBook Pro`.
    pub device_name: String,
}

/// Turns a machine's host name, such as `Xs-MacBook-Pro.local`, into a name for people, such as `Xs MacBook Pro`.
pub fn device_name_from_host_name(host_name: &str) -> String {
    let name = host_name.trim();
    let name = name.strip_suffix(".local").unwrap_or(name);
    name.replace(['-', '_'], " ").trim().to_string()
}

/// How clients prove they may use the server.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum ServerAuthMode {
    /// A token generated at each launch, handed to a paired device through a pairing code.
    LaunchToken,
    /// Accounts with passwords.
    Accounts,
}

/// A snapshot of the embedded server's state.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct DesktopServerStatus {
    pub state: ServerRunState,
    /// Addresses other devices can use to reach the server, such as `http://192.168.1.5:8787`.
    pub urls: Vec<String>,
    /// Whether the server is running, bound to a non-loopback address, and has at least one
    /// non-loopback IPv4 address.
    pub lan_reachable: bool,
    /// Whether the server is serving the web app.
    pub serves_web_app: bool,
    /// The address to encode in a QR code for pairing another device, while running.
    pub pairing_url: Option<String>,
}

/// Whether the public listener is accepting connections.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export)]
pub enum ServerRunState {
    Stopped,
    Starting,
    Running,
    Failed { message: String },
}

/// One record of the server's log.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ServerLogEntry {
    /// When the record was written, in milliseconds since the Unix epoch.
    pub time_ms: u64,
    pub level: LogLevel,
    /// The module that wrote the record.
    pub target: String,
    pub message: String,
}

/// The severity of a log record, from most to least severe.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn drops_the_local_domain() {
        assert_eq!(device_name_from_host_name("studio.local"), "studio");
    }

    #[test]
    fn turns_hyphens_into_spaces() {
        assert_eq!(
            device_name_from_host_name("Xs-MacBook-Pro.local"),
            "Xs MacBook Pro"
        );
    }

    #[test]
    fn turns_underscores_into_spaces() {
        assert_eq!(device_name_from_host_name("home_desktop"), "home desktop");
    }

    #[test]
    fn keeps_other_domains() {
        assert_eq!(
            device_name_from_host_name("studio.example.org"),
            "studio.example.org"
        );
    }
}
