/// Settings the router needs to authenticate requests.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ApiConfig {
    /// The bearer token every request except the health check must present.
    pub token: String,
    /// Whether requests may name files on the server's own file system.
    pub allow_local_paths: bool,
    /// Values the `Host` header must equal exactly, such as `127.0.0.1:8787`.
    pub expected_hosts: Vec<String>,
}

impl ApiConfig {
    /// Builds the configuration for a server bound to the loopback interface on `port`.
    pub fn for_loopback(port: u16, token: String, allow_local_paths: bool) -> Self {
        Self {
            token,
            allow_local_paths,
            expected_hosts: vec![format!("127.0.0.1:{port}"), format!("localhost:{port}")],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expects_both_loopback_spellings_of_the_host() {
        let config = ApiConfig::for_loopback(8787, "t".to_string(), false);
        assert_eq!(
            config.expected_hosts,
            vec!["127.0.0.1:8787", "localhost:8787"]
        );
    }
}
