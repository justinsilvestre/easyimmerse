use serde::Deserialize;

use crate::error::PluginError;

/// The contents of a plugin's `plugin.toml`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub kind: PluginKind,
    /// The version of the `easyimmerse:plugin` WIT package the plugin was built against.
    pub interface_version: String,
    /// Host names the plugin may reach through the `http` import.
    #[serde(default)]
    pub allowed_hosts: Vec<String>,
    #[serde(default)]
    pub settings: Vec<SettingSchema>,
}

/// The capability a plugin exports. `Hello` exists only for the host tests.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PluginKind {
    SpeechToText,
    TextToSpeech,
    Translation,
    Alignment,
    DictionaryFormat,
    MediaStep,
    FlashcardExport,
    MediaSource,
    Hello,
}

/// A value the user enters for a plugin, which the plugin reads through the
/// `secrets` import.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct SettingSchema {
    pub key: String,
    pub label: String,
    /// Whether the value is hidden in the user interface and kept in the credential store.
    pub secret: bool,
}

pub fn parse_manifest(text: &str) -> Result<PluginManifest, PluginError> {
    Ok(toml::from_str(text)?)
}

#[cfg(test)]
mod tests {
    use super::{PluginKind, SettingSchema, parse_manifest};

    const FULL_MANIFEST: &str = r#"
name = "deepl-translation"
version = "1.2.0"
kind = "translation"
interface_version = "0.1.0"
allowed_hosts = ["api.deepl.com"]

[[settings]]
key = "api_key"
label = "DeepL API key"
secret = true
"#;

    const MINIMAL_MANIFEST: &str = r#"
name = "hello-rust"
version = "0.1.0"
kind = "hello"
interface_version = "0.1.0"
"#;

    #[test]
    fn reads_the_kind_in_kebab_case() {
        let manifest = parse_manifest(FULL_MANIFEST).unwrap();
        assert_eq!(manifest.kind, PluginKind::Translation);
    }

    #[test]
    fn reads_the_allowed_hosts() {
        let manifest = parse_manifest(FULL_MANIFEST).unwrap();
        assert_eq!(manifest.allowed_hosts, vec!["api.deepl.com".to_string()]);
    }

    #[test]
    fn reads_the_settings_schema() {
        let manifest = parse_manifest(FULL_MANIFEST).unwrap();
        assert_eq!(
            manifest.settings,
            vec![SettingSchema {
                key: "api_key".to_string(),
                label: "DeepL API key".to_string(),
                secret: true,
            }]
        );
    }

    #[test]
    fn defaults_the_settings_to_empty() {
        let manifest = parse_manifest(MINIMAL_MANIFEST).unwrap();
        assert!(manifest.settings.is_empty());
    }

    #[test]
    fn rejects_an_unknown_kind() {
        let text = MINIMAL_MANIFEST.replace("\"hello\"", "\"video-editing\"");
        assert!(parse_manifest(&text).is_err());
    }

    #[test]
    fn rejects_a_manifest_without_a_name() {
        let text = MINIMAL_MANIFEST.replace("name = \"hello-rust\"\n", "");
        assert!(parse_manifest(&text).is_err());
    }
}
