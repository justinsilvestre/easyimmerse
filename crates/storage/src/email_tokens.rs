//! The tokens of links mailed to an account's address, each good for one purpose and one use.

use rusqlite::{Connection, OptionalExtension, params};

use crate::error::StorageError;
use crate::stored_integer::{read_unsigned, to_stored_integer};
use crate::users;

/// What following a mailed link does.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EmailTokenPurpose {
    ConfirmEmail,
    ResetPassword,
}

impl EmailTokenPurpose {
    fn as_str(self) -> &'static str {
        match self {
            EmailTokenPurpose::ConfirmEmail => "confirm_email",
            EmailTokenPurpose::ResetPassword => "reset_password",
        }
    }
}

/// A token to record under its hash.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NewEmailToken<'a> {
    pub token_hash: &'a str,
    pub user_id: &'a str,
    pub purpose: EmailTokenPurpose,
    pub created_at_ms: u64,
    pub expires_at_ms: u64,
}

/// Records the token, replacing the user's earlier tokens of the same purpose
/// and deleting every token that has expired by the time it was created.
pub fn issue_email_token(conn: &mut Connection, token: &NewEmailToken) -> Result<(), StorageError> {
    let transaction = conn.transaction()?;
    transaction.execute(
        "DELETE FROM email_tokens WHERE (user_id = ?1 AND purpose = ?2) OR expires_at_ms <= ?3",
        params![
            token.user_id,
            token.purpose.as_str(),
            to_stored_integer(token.created_at_ms)
        ],
    )?;
    transaction.execute(
        "INSERT INTO email_tokens (token_hash, user_id, purpose, created_at_ms, expires_at_ms) \
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            token.token_hash,
            token.user_id,
            token.purpose.as_str(),
            to_stored_integer(token.created_at_ms),
            to_stored_integer(token.expires_at_ms)
        ],
    )?;
    transaction.commit()?;
    Ok(())
}

/// Deletes the token stored under the hash for the purpose and returns its user's id,
/// or None when there is no such token or it expired by `now_ms`.
pub fn take_email_token(
    conn: &Connection,
    token_hash: &str,
    purpose: EmailTokenPurpose,
    now_ms: u64,
) -> Result<Option<String>, StorageError> {
    let taken: Option<(String, u64)> = conn
        .query_row(
            "DELETE FROM email_tokens WHERE token_hash = ?1 AND purpose = ?2 \
             RETURNING user_id, expires_at_ms",
            params![token_hash, purpose.as_str()],
            |row| Ok((row.get(0)?, read_unsigned(row, 1)?)),
        )
        .optional()?;
    Ok(taken
        .filter(|(_, expires_at_ms)| *expires_at_ms > now_ms)
        .map(|(user_id, _)| user_id))
}

/// Takes a confirmation token and records that its user confirmed their address at `now_ms`, in one transaction.
/// Returns whether the token was live.
pub fn confirm_email_with_token(
    conn: &mut Connection,
    token_hash: &str,
    now_ms: u64,
) -> Result<bool, StorageError> {
    let transaction = conn.transaction()?;
    let taken = take_email_token(
        &transaction,
        token_hash,
        EmailTokenPurpose::ConfirmEmail,
        now_ms,
    )?;
    if let Some(user_id) = &taken {
        users::confirm_email(&transaction, user_id, now_ms)?;
    }
    transaction.commit()?;
    Ok(taken.is_some())
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::account::{AccountRole, AccountUser};

    use super::*;
    use crate::Storage;

    fn token<'a>(
        token_hash: &'a str,
        user: &'a AccountUser,
        purpose: EmailTokenPurpose,
    ) -> NewEmailToken<'a> {
        NewEmailToken {
            token_hash,
            user_id: &user.id,
            purpose,
            created_at_ms: 1_000,
            expires_at_ms: 2_000,
        }
    }

    fn storage_with_token(purpose: EmailTokenPurpose) -> (Storage, AccountUser) {
        let storage = Storage::open_in_memory().unwrap();
        let user = storage
            .create_user("reader@example.com", "hash", AccountRole::LibraryUser)
            .unwrap();
        storage
            .issue_email_token(&token("token-hash", &user, purpose))
            .unwrap();
        (storage, user)
    }

    fn take_reset(storage: &Storage, token_hash: &str, now_ms: u64) -> Option<String> {
        storage
            .take_email_token(token_hash, EmailTokenPurpose::ResetPassword, now_ms)
            .unwrap()
    }

    #[test]
    fn takes_a_live_token_for_its_user() {
        let (storage, user) = storage_with_token(EmailTokenPurpose::ResetPassword);
        assert_eq!(take_reset(&storage, "token-hash", 1_500), Some(user.id));
    }

    #[test]
    fn a_token_is_taken_only_once() {
        let (storage, _) = storage_with_token(EmailTokenPurpose::ResetPassword);
        take_reset(&storage, "token-hash", 1_500);
        assert_eq!(take_reset(&storage, "token-hash", 1_500), None);
    }

    #[test]
    fn an_expired_token_is_not_taken() {
        let (storage, _) = storage_with_token(EmailTokenPurpose::ResetPassword);
        assert_eq!(take_reset(&storage, "token-hash", 2_000), None);
    }

    #[test]
    fn a_token_of_another_purpose_is_not_taken() {
        let (storage, _) = storage_with_token(EmailTokenPurpose::ConfirmEmail);
        assert_eq!(take_reset(&storage, "token-hash", 1_500), None);
    }

    #[test]
    fn a_new_token_replaces_the_earlier_one_of_its_purpose() {
        let (storage, user) = storage_with_token(EmailTokenPurpose::ResetPassword);
        storage
            .issue_email_token(&token("newer", &user, EmailTokenPurpose::ResetPassword))
            .unwrap();
        assert_eq!(take_reset(&storage, "token-hash", 1_500), None);
    }

    #[test]
    fn a_new_token_keeps_the_earlier_one_of_another_purpose() {
        let (storage, user) = storage_with_token(EmailTokenPurpose::ResetPassword);
        storage
            .issue_email_token(&token("newer", &user, EmailTokenPurpose::ConfirmEmail))
            .unwrap();
        assert!(take_reset(&storage, "token-hash", 1_500).is_some());
    }

    #[test]
    fn confirming_with_a_live_token_records_the_confirmation() {
        let (storage, user) = storage_with_token(EmailTokenPurpose::ConfirmEmail);
        storage
            .confirm_email_with_token("token-hash", 1_500)
            .unwrap();
        let confirmed = storage.get_user(&user.id).unwrap().email_confirmed_at_ms;
        assert_eq!(confirmed, Some(1_500));
    }

    #[test]
    fn confirming_with_an_unknown_token_reports_it() {
        let (storage, _) = storage_with_token(EmailTokenPurpose::ConfirmEmail);
        assert!(!storage.confirm_email_with_token("other", 1_500).unwrap());
    }

    #[test]
    fn deleting_a_user_deletes_their_tokens() {
        let (storage, user) = storage_with_token(EmailTokenPurpose::ResetPassword);
        storage.delete_user(&user.id).unwrap();
        assert_eq!(take_reset(&storage, "token-hash", 1_500), None);
    }
}
