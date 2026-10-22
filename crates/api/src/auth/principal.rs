use easyimmerse_core::account::{AccountRole, AccountUser};

use crate::config::ApiConfig;

/// Who a request comes from, once its token has been checked.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Principal {
    /// The holder of the launch token, who owns the machine the server runs on.
    Launch,
    /// The user of a session, with the role the account had when the request arrived, and the session's id.
    Account {
        user_id: String,
        role: AccountRole,
        session_id: String,
    },
}

impl Principal {
    pub fn of_session(user: &AccountUser, session_id: &str) -> Self {
        Principal::Account {
            user_id: user.id.clone(),
            role: user.role,
            session_id: session_id.to_string(),
        }
    }

    /// Only the launch principal may name files on the server's machine,
    /// since an account's requests may come from another machine.
    pub fn allows_local_paths(&self, config: &ApiConfig) -> bool {
        matches!(self, Principal::Launch) && config.allow_local_paths
    }

    /// The launch principal acts as an administrator.
    pub fn is_administrator(&self) -> bool {
        match self {
            Principal::Launch => true,
            Principal::Account { role, .. } => *role == AccountRole::Administrator,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn account(role: AccountRole) -> Principal {
        Principal::Account {
            user_id: "u".to_string(),
            role,
            session_id: "s".to_string(),
        }
    }

    #[test]
    fn the_launch_principal_reads_local_paths_when_the_config_allows_it() {
        let config = ApiConfig::for_loopback(1, "t".to_string(), true);
        assert!(Principal::Launch.allows_local_paths(&config));
    }

    #[test]
    fn the_launch_principal_reads_no_local_paths_when_the_config_forbids_it() {
        let config = ApiConfig::for_loopback(1, "t".to_string(), false);
        assert!(!Principal::Launch.allows_local_paths(&config));
    }

    #[test]
    fn an_account_reads_no_local_paths_even_when_the_config_allows_it() {
        let config = ApiConfig::for_loopback(1, "t".to_string(), true);
        assert!(!account(AccountRole::Administrator).allows_local_paths(&config));
    }

    #[test]
    fn the_launch_principal_is_an_administrator() {
        assert!(Principal::Launch.is_administrator());
    }

    #[test]
    fn an_administrator_account_is_an_administrator() {
        assert!(account(AccountRole::Administrator).is_administrator());
    }

    #[test]
    fn a_privileged_account_is_not_an_administrator() {
        assert!(!account(AccountRole::Privileged).is_administrator());
    }
}
