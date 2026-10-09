use std::path::{Path, PathBuf};

/// Settings the router needs to authenticate requests.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ApiConfig {
    /// The bearer token every request except the health check must present.
    pub token: String,
    /// Whether requests may name files on the server's own file system.
    pub allow_local_paths: bool,
    /// Values the `Host` header must equal exactly, such as `127.0.0.1:8787`.
    pub expected_hosts: Vec<String>,
    /// Directories the server writes itself, such as the one plugins fetch media into.
    /// Every token may read the files inside them, since no request chose their paths.
    pub server_dirs: Vec<PathBuf>,
}

impl ApiConfig {
    /// Builds the configuration for a server bound to the loopback interface on `port`.
    pub fn for_loopback(port: u16, token: String, allow_local_paths: bool) -> Self {
        Self {
            token,
            allow_local_paths,
            expected_hosts: vec![format!("127.0.0.1:{port}"), format!("localhost:{port}")],
            server_dirs: Vec::new(),
        }
    }

    /// Whether `path` names an existing file inside one of the server's own directories.
    /// Both sides are canonicalized, so neither symbolic links nor `..` components escape.
    pub fn is_server_path(&self, path: &str) -> bool {
        let Ok(path) = Path::new(path).canonicalize() else {
            return false;
        };
        self.server_dirs
            .iter()
            .filter_map(|dir| dir.canonicalize().ok())
            .any(|dir| path.starts_with(dir))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config_with_server_dir(dir: &Path) -> ApiConfig {
        let mut config = ApiConfig::for_loopback(1, "t".to_string(), false);
        config.server_dirs.push(dir.to_path_buf());
        config
    }

    #[test]
    fn recognizes_a_file_inside_a_server_dir() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("a.txt");
        std::fs::write(&file, "a").unwrap();
        assert!(config_with_server_dir(dir.path()).is_server_path(&file.to_string_lossy()));
    }

    #[test]
    fn does_not_recognize_a_file_outside_the_server_dirs() {
        let dir = tempfile::tempdir().unwrap();
        let other = tempfile::tempdir().unwrap();
        let file = other.path().join("a.txt");
        std::fs::write(&file, "a").unwrap();
        assert!(!config_with_server_dir(dir.path()).is_server_path(&file.to_string_lossy()));
    }

    #[test]
    fn does_not_recognize_a_path_that_escapes_a_server_dir() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("escaped.txt");
        std::fs::write(&file, "a").unwrap();
        let inside = dir.path().join("inside");
        std::fs::create_dir(&inside).unwrap();
        let escaping = inside.join("..").join("escaped.txt");
        assert!(!config_with_server_dir(&inside).is_server_path(&escaping.to_string_lossy()));
    }

    #[test]
    fn expects_both_loopback_spellings_of_the_host() {
        let config = ApiConfig::for_loopback(8787, "t".to_string(), false);
        assert_eq!(
            config.expected_hosts,
            vec!["127.0.0.1:8787", "localhost:8787"]
        );
    }
}
