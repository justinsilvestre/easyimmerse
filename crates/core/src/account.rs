//! Accounts: the users of a server that has them, and the roles that decide what each may do.

use std::fmt;
use std::str::FromStr;

use serde::{Deserialize, Serialize};
use thiserror::Error;
use ts_rs::TS;
use utoipa::ToSchema;

/// What an account may do on its server.
/// On the official server a subscriber is `privileged`; on a self-hosted server the administrator assigns roles.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum AccountRole {
    LibraryUser,
    Privileged,
    /// May manage the server's accounts.
    Administrator,
}

/// An account as the server shows it, without its password.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AccountUser {
    pub id: String,
    pub email: String,
    pub role: AccountRole,
    /// Milliseconds since the Unix epoch.
    pub created_at_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum AccountError {
    #[error("{0:?} is not a role; the roles are library_user, privileged and administrator")]
    UnknownRole(String),
}

impl AccountRole {
    /// The role's name as it is serialized, stored and typed on the command line.
    pub fn as_str(self) -> &'static str {
        match self {
            AccountRole::LibraryUser => "library_user",
            AccountRole::Privileged => "privileged",
            AccountRole::Administrator => "administrator",
        }
    }
}

impl FromStr for AccountRole {
    type Err = AccountError;

    fn from_str(name: &str) -> Result<Self, Self::Err> {
        [
            AccountRole::LibraryUser,
            AccountRole::Privileged,
            AccountRole::Administrator,
        ]
        .into_iter()
        .find(|role| role.as_str() == name)
        .ok_or_else(|| AccountError::UnknownRole(name.to_string()))
    }
}

impl fmt::Display for AccountRole {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_a_role_in_snake_case() {
        let json = serde_json::to_value(AccountRole::LibraryUser).unwrap();
        assert_eq!(json, serde_json::json!("library_user"));
    }

    #[test]
    fn parses_the_name_it_serializes_to() {
        assert_eq!(
            "administrator".parse::<AccountRole>(),
            Ok(AccountRole::Administrator)
        );
    }

    #[test]
    fn refuses_an_unknown_role_name() {
        assert!("owner".parse::<AccountRole>().is_err());
    }

    #[test]
    fn serializes_the_creation_time_in_snake_case() {
        let user = AccountUser {
            id: "u".to_string(),
            email: "admin@example.com".to_string(),
            role: AccountRole::Administrator,
            created_at_ms: 1,
        };
        let json = serde_json::to_value(&user).unwrap();
        assert_eq!(json["created_at_ms"], 1);
    }
}
