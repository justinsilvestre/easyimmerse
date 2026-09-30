use crate::config::ApiConfig;

/// Which kind of credential authenticated a request.
///
/// Only the per-launch token exists so far. Pairing tokens for LAN devices and account
/// tokens for cloud and self-hosted instances are added later; neither of them will allow
/// reading local paths, since the request then comes from another machine.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TokenKind {
    Launch,
}

impl TokenKind {
    pub fn allows_local_paths(self, config: &ApiConfig) -> bool {
        match self {
            TokenKind::Launch => config.allow_local_paths,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_launch_token_allows_local_paths_when_the_config_does() {
        let config = ApiConfig::for_loopback(1, "t".to_string(), true);
        assert!(TokenKind::Launch.allows_local_paths(&config));
    }

    #[test]
    fn the_launch_token_denies_local_paths_when_the_config_does() {
        let config = ApiConfig::for_loopback(1, "t".to_string(), false);
        assert!(!TokenKind::Launch.allows_local_paths(&config));
    }
}
