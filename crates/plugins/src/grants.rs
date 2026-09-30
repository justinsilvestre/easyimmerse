use std::collections::HashMap;
use std::path::{Component, Path, PathBuf};

use crate::error::PluginError;

/// What one plugin instance is allowed to reach through the host imports.
#[derive(Debug, Clone, Default)]
pub struct CapabilityGrants {
    /// Host names the `http` import may request, compared case-insensitively.
    pub allowed_hosts: Vec<String>,
    /// Directories the `fs` import may read and write, including their subdirectories.
    pub granted_dirs: Vec<PathBuf>,
    /// The directory holding the executables the `run-command` import may run.
    pub bundled_bin_dir: Option<PathBuf>,
    /// The values the user entered for the settings the manifest declares, keyed by setting key.
    /// The plugin reads them through the `secrets` import.
    pub setting_values: HashMap<String, String>,
}

impl CapabilityGrants {
    pub fn is_host_allowed(&self, url: &str) -> bool {
        let Some(host) = host_of(url) else {
            return false;
        };
        self.allowed_hosts
            .iter()
            .any(|allowed| allowed.eq_ignore_ascii_case(host))
    }

    /// Checks that `path` names a file inside a granted directory. The file
    /// itself may not exist yet, but its parent directory must.
    pub fn resolve_granted_path(&self, path: &str) -> Result<PathBuf, PluginError> {
        let path = Path::new(path);
        let (parent, file_name) = split_file_path(path)?;
        let parent = parent
            .canonicalize()
            .map_err(|source| PluginError::io("resolving the directory", parent, source))?;
        if !self.is_dir_granted(&parent) {
            return Err(PluginError::NotPermitted(format!(
                "{} is outside the granted directories",
                path.display()
            )));
        }
        Ok(parent.join(file_name))
    }

    /// Finds the bundled executable named `name`, which must be a bare file
    /// name. Script extensions are tried in the order the platform runs them.
    pub fn resolve_bundled_command(&self, name: &str) -> Result<PathBuf, PluginError> {
        if !is_bare_file_name(name) {
            return Err(PluginError::NotPermitted(format!(
                "{name} is not a bare executable name"
            )));
        }
        let Some(bin_dir) = &self.bundled_bin_dir else {
            return Err(PluginError::NotPermitted(format!(
                "{name} is not bundled with the plugin"
            )));
        };
        bundled_command_candidates(bin_dir, name)
            .into_iter()
            .find(|candidate| candidate.is_file())
            .ok_or_else(|| {
                PluginError::NotPermitted(format!("{name} is not bundled with the plugin"))
            })
    }

    fn is_dir_granted(&self, canonical_dir: &Path) -> bool {
        self.granted_dirs
            .iter()
            .filter_map(|dir| dir.canonicalize().ok())
            .any(|granted| canonical_dir.starts_with(granted))
    }
}

/// File extensions the host recognizes as runnable, tried after the bare name.
#[cfg(windows)]
pub const COMMAND_EXTENSIONS: &[&str] = &["cmd", "exe", "bat"];
#[cfg(not(windows))]
pub const COMMAND_EXTENSIONS: &[&str] = &["sh"];

fn bundled_command_candidates(bin_dir: &Path, name: &str) -> Vec<PathBuf> {
    std::iter::once(bin_dir.join(name))
        .chain(
            COMMAND_EXTENSIONS
                .iter()
                .map(|extension| bin_dir.join(format!("{name}.{extension}"))),
        )
        .collect()
}

fn is_bare_file_name(name: &str) -> bool {
    let mut components = Path::new(name).components();
    matches!(
        (components.next(), components.next()),
        (Some(Component::Normal(_)), None)
    )
}

fn split_file_path(path: &Path) -> Result<(&Path, &std::ffi::OsStr), PluginError> {
    match (path.parent(), path.file_name()) {
        (Some(parent), Some(file_name)) if path.is_absolute() => Ok((parent, file_name)),
        _ => Err(PluginError::NotPermitted(format!(
            "{} is not an absolute file path",
            path.display()
        ))),
    }
}

/// The host part of `url`: the text after `://` up to the first `/`, without
/// any port or credentials. Returns `None` when `url` has no scheme.
fn host_of(url: &str) -> Option<&str> {
    let (_, rest) = url.split_once("://")?;
    let authority = rest.split(['/', '?', '#']).next()?;
    let host_and_port = authority
        .rsplit_once('@')
        .map_or(authority, |(_, host)| host);
    let host = strip_port(host_and_port);
    (!host.is_empty()).then_some(host)
}

fn strip_port(host_and_port: &str) -> &str {
    if host_and_port.starts_with('[') {
        return host_and_port
            .split_once(']')
            .map_or(host_and_port, |(ipv6, _)| &ipv6[1..]);
    }
    host_and_port
        .rsplit_once(':')
        .map_or(host_and_port, |(host, _)| host)
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::CapabilityGrants;
    use crate::error::PluginError;

    fn grants_for_host(host: &str) -> CapabilityGrants {
        CapabilityGrants {
            allowed_hosts: vec![host.to_string()],
            ..CapabilityGrants::default()
        }
    }

    #[test]
    fn allows_a_listed_host() {
        assert!(grants_for_host("127.0.0.1").is_host_allowed("http://127.0.0.1:8080/sample.mp4"));
    }

    #[test]
    fn compares_hosts_case_insensitively() {
        assert!(grants_for_host("Example.com").is_host_allowed("https://example.COM/"));
    }

    #[test]
    fn refuses_an_unlisted_host() {
        assert!(!grants_for_host("127.0.0.1").is_host_allowed("http://example.com/"));
    }

    #[test]
    fn refuses_a_url_without_a_scheme() {
        assert!(!grants_for_host("example.com").is_host_allowed("example.com/path"));
    }

    #[test]
    fn ignores_credentials_before_the_host() {
        assert!(grants_for_host("example.com").is_host_allowed("http://user:pw@example.com/"));
    }

    #[test]
    fn strips_the_port_from_a_bracketed_ipv6_host() {
        assert!(grants_for_host("::1").is_host_allowed("http://[::1]:8080/"));
    }

    #[test]
    fn resolves_a_new_file_inside_a_granted_dir() {
        let dir = tempfile::tempdir().unwrap();
        let grants = CapabilityGrants {
            granted_dirs: vec![dir.path().to_path_buf()],
            ..CapabilityGrants::default()
        };
        let resolved = grants.resolve_granted_path(&dir.path().join("new.txt").to_string_lossy());
        assert_eq!(
            resolved.unwrap(),
            dir.path().canonicalize().unwrap().join("new.txt")
        );
    }

    #[test]
    fn refuses_a_file_outside_the_granted_dirs() {
        let granted = tempfile::tempdir().unwrap();
        let other = tempfile::tempdir().unwrap();
        let grants = CapabilityGrants {
            granted_dirs: vec![granted.path().to_path_buf()],
            ..CapabilityGrants::default()
        };
        let resolved = grants.resolve_granted_path(&other.path().join("x.txt").to_string_lossy());
        assert!(matches!(resolved, Err(PluginError::NotPermitted(_))));
    }

    #[test]
    fn refuses_a_path_that_escapes_through_parent_components() {
        let dir = tempfile::tempdir().unwrap();
        let grants = CapabilityGrants {
            granted_dirs: vec![dir.path().to_path_buf()],
            ..CapabilityGrants::default()
        };
        let escaping = dir.path().join("..").join("escaped.txt");
        let resolved = grants.resolve_granted_path(&escaping.to_string_lossy());
        assert!(matches!(resolved, Err(PluginError::NotPermitted(_))));
    }

    #[test]
    fn refuses_a_relative_path() {
        let grants = CapabilityGrants::default();
        assert!(matches!(
            grants.resolve_granted_path("relative.txt"),
            Err(PluginError::NotPermitted(_))
        ));
    }

    #[test]
    fn refuses_a_file_whose_parent_does_not_exist() {
        let dir = tempfile::tempdir().unwrap();
        let grants = CapabilityGrants {
            granted_dirs: vec![dir.path().to_path_buf()],
            ..CapabilityGrants::default()
        };
        let missing = dir.path().join("missing").join("x.txt");
        assert!(
            grants
                .resolve_granted_path(&missing.to_string_lossy())
                .is_err()
        );
    }

    #[test]
    fn resolves_a_bundled_command_by_its_bare_name() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("tool"), "").unwrap();
        let grants = CapabilityGrants {
            bundled_bin_dir: Some(dir.path().to_path_buf()),
            ..CapabilityGrants::default()
        };
        assert_eq!(
            grants.resolve_bundled_command("tool").unwrap(),
            dir.path().join("tool")
        );
    }

    #[test]
    fn resolves_a_bundled_script_by_its_name_without_the_extension() {
        let dir = tempfile::tempdir().unwrap();
        let script = dir
            .path()
            .join(format!("tool.{}", super::COMMAND_EXTENSIONS[0]));
        std::fs::write(&script, "").unwrap();
        let grants = CapabilityGrants {
            bundled_bin_dir: Some(dir.path().to_path_buf()),
            ..CapabilityGrants::default()
        };
        assert_eq!(grants.resolve_bundled_command("tool").unwrap(), script);
    }

    #[test]
    fn refuses_a_command_that_is_not_bundled() {
        let dir = tempfile::tempdir().unwrap();
        let grants = CapabilityGrants {
            bundled_bin_dir: Some(dir.path().to_path_buf()),
            ..CapabilityGrants::default()
        };
        assert!(matches!(
            grants.resolve_bundled_command("ls"),
            Err(PluginError::NotPermitted(_))
        ));
    }

    #[test]
    fn refuses_a_command_name_with_a_path_separator() {
        let grants = CapabilityGrants {
            bundled_bin_dir: Some(PathBuf::from("/")),
            ..CapabilityGrants::default()
        };
        assert!(matches!(
            grants.resolve_bundled_command("bin/ls"),
            Err(PluginError::NotPermitted(_))
        ));
    }

    #[test]
    fn refuses_every_command_when_no_bin_dir_is_bundled() {
        let grants = CapabilityGrants::default();
        assert!(matches!(
            grants.resolve_bundled_command("tool"),
            Err(PluginError::NotPermitted(_))
        ));
    }
}
