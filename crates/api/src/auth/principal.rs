use easyimmerse_core::account::{AccountRole, AccountUser};
use easyimmerse_storage::OwnerId;

use crate::config::ApiConfig;

/// Who a request comes from, once its token has been checked.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Principal {
    /// The holder of the launch token, who owns the machine the server runs on.
    Launch,
    /// The user of a session, with the role and library permission the account had when the request arrived,
    /// and the session's id.
    Account {
        user_id: String,
        role: AccountRole,
        manages_library: bool,
        session_id: String,
    },
}

impl Principal {
    pub fn of_session(user: &AccountUser, session_id: &str) -> Self {
        Principal::Account {
            user_id: user.id.clone(),
            role: user.role,
            manages_library: user.manages_library,
            session_id: session_id.to_string(),
        }
    }

    /// Only the launch principal may name files on the server's machine,
    /// since an account's requests may come from another machine.
    pub fn allows_local_paths(&self, config: &ApiConfig) -> bool {
        matches!(self, Principal::Launch) && config.allow_local_paths
    }

    /// The owner of the data the principal works with: the device's own data for the launch principal,
    /// and the account's for a session.
    pub fn owner_id(&self) -> OwnerId {
        match self {
            Principal::Launch => OwnerId::launch(),
            Principal::Account { user_id, .. } => OwnerId(user_id.clone()),
        }
    }

    /// The launch principal acts as an administrator.
    pub fn is_administrator(&self) -> bool {
        match self {
            Principal::Launch => true,
            Principal::Account { role, .. } => *role == AccountRole::Administrator,
        }
    }

    /// Administrators always manage the library; other accounts only when an administrator let them.
    pub fn can_manage_library(&self) -> bool {
        match self {
            Principal::Launch => true,
            Principal::Account {
                manages_library, ..
            } => *manages_library || self.is_administrator(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn account(role: AccountRole) -> Principal {
        account_managing_library(role, false)
    }

    fn account_managing_library(role: AccountRole, manages_library: bool) -> Principal {
        Principal::Account {
            user_id: "u".to_string(),
            role,
            manages_library,
            session_id: "s".to_string(),
        }
    }

    #[test]
    fn the_launch_principal_owns_the_launch_data() {
        assert_eq!(Principal::Launch.owner_id(), OwnerId::launch());
    }

    #[test]
    fn an_account_owns_the_data_under_its_user_id() {
        let principal = account(AccountRole::LibraryUser);
        assert_eq!(principal.owner_id(), OwnerId("u".to_string()));
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

    #[test]
    fn the_launch_principal_manages_the_library() {
        assert!(Principal::Launch.can_manage_library());
    }

    #[test]
    fn an_administrator_manages_the_library_without_the_flag() {
        assert!(account(AccountRole::Administrator).can_manage_library());
    }

    #[test]
    fn a_flagged_library_user_manages_the_library() {
        let principal = account_managing_library(AccountRole::LibraryUser, true);
        assert!(principal.can_manage_library());
    }

    #[test]
    fn a_privileged_account_without_the_flag_does_not_manage_the_library() {
        assert!(!account(AccountRole::Privileged).can_manage_library());
    }
}
