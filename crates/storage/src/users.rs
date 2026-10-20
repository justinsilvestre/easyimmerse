use easyimmerse_core::account::{AccountRole, AccountUser};
use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::error::StorageError;
use crate::new_row::{generate_id, now_ms};
use crate::stored_integer::{read_unsigned, to_stored_integer};

/// An account together with the hash of its password, for logging in.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoredUser {
    pub user: AccountUser,
    pub password_hash: String,
}

pub const USER_COLUMNS: &str = "u.id, u.email, u.role, u.created_at_ms";

/// Creates an account, unless one already has the email address in any letter case.
pub fn create_user(
    conn: &Connection,
    email: &str,
    password_hash: &str,
    role: AccountRole,
) -> Result<AccountUser, StorageError> {
    let id = generate_id();
    let inserted = conn.execute(
        "INSERT INTO users (id, email, password_hash, role, created_at_ms) \
         VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT (email) DO NOTHING",
        params![
            id,
            email,
            password_hash,
            role.as_str(),
            to_stored_integer(now_ms())
        ],
    )?;
    if inserted == 0 {
        return Err(StorageError::EmailTaken(email.to_string()));
    }
    get_user(conn, &id)
}

pub fn get_user(conn: &Connection, id: &str) -> Result<AccountUser, StorageError> {
    conn.query_row(
        &format!("SELECT {USER_COLUMNS} FROM users u WHERE u.id = ?1"),
        params![id],
        read_user,
    )
    .optional()?
    .ok_or_else(|| StorageError::UserNotFound(id.to_string()))
}

/// Finds the account with the email address, compared without regard to letter case.
pub fn find_user_by_email(
    conn: &Connection,
    email: &str,
) -> Result<Option<StoredUser>, StorageError> {
    let found = conn
        .query_row(
            &format!("SELECT {USER_COLUMNS}, u.password_hash FROM users u WHERE u.email = ?1"),
            params![email],
            |row| {
                Ok(StoredUser {
                    user: read_user(row)?,
                    password_hash: row.get(4)?,
                })
            },
        )
        .optional()?;
    Ok(found)
}

/// Lists every account, oldest first.
pub fn list_users(conn: &Connection) -> Result<Vec<AccountUser>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {USER_COLUMNS} FROM users u ORDER BY u.created_at_ms, u.rowid"
    ))?;
    let users = statement
        .query_map([], read_user)?
        .collect::<Result<_, _>>()?;
    Ok(users)
}

/// Changes an account's role, unless that would leave no administrator account.
pub fn set_user_role(
    conn: &Connection,
    id: &str,
    role: AccountRole,
) -> Result<AccountUser, StorageError> {
    if role != AccountRole::Administrator {
        ensure_not_last_administrator(conn, id)?;
    }
    let updated = conn.execute(
        "UPDATE users SET role = ?2 WHERE id = ?1",
        params![id, role.as_str()],
    )?;
    if updated == 0 {
        return Err(StorageError::UserNotFound(id.to_string()));
    }
    get_user(conn, id)
}

/// Replaces the password hash of an account and ends all of its sessions, in one transaction.
pub fn set_password_hash(
    conn: &mut Connection,
    id: &str,
    password_hash: &str,
) -> Result<(), StorageError> {
    let transaction = conn.transaction()?;
    let updated = transaction.execute(
        "UPDATE users SET password_hash = ?2 WHERE id = ?1",
        params![id, password_hash],
    )?;
    if updated == 0 {
        return Err(StorageError::UserNotFound(id.to_string()));
    }
    transaction.execute("DELETE FROM sessions WHERE user_id = ?1", params![id])?;
    transaction.commit()?;
    Ok(())
}

/// Deletes an account together with its sessions, unless it is the last administrator account.
pub fn delete_user(conn: &Connection, id: &str) -> Result<(), StorageError> {
    ensure_not_last_administrator(conn, id)?;
    let deleted = conn.execute("DELETE FROM users WHERE id = ?1", params![id])?;
    if deleted == 0 {
        return Err(StorageError::UserNotFound(id.to_string()));
    }
    Ok(())
}

/// Fails when the account is an administrator and no other account is.
/// Every write runs on the one writer connection, so no other change can come between this check and the write.
fn ensure_not_last_administrator(conn: &Connection, id: &str) -> Result<(), StorageError> {
    let administrator = AccountRole::Administrator.as_str();
    let is_last: bool = conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM users WHERE id = ?1 AND role = ?2) \
         AND (SELECT COUNT(*) FROM users WHERE role = ?2) = 1",
        params![id, administrator],
        |row| row.get(0),
    )?;
    if is_last {
        Err(StorageError::LastAdministrator(id.to_string()))
    } else {
        Ok(())
    }
}

/// Reads the columns of `USER_COLUMNS` at the start of the row.
pub fn read_user(row: &Row) -> rusqlite::Result<AccountUser> {
    let role: String = row.get(2)?;
    Ok(AccountUser {
        id: row.get(0)?,
        email: row.get(1)?,
        role: role.parse().map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(
                2,
                rusqlite::types::Type::Text,
                Box::new(error),
            )
        })?,
        created_at_ms: read_unsigned(row, 3)?,
    })
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::account::AccountRole;

    use crate::{Storage, StorageError};

    fn storage_with_user(email: &str) -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        storage
            .create_user(email, "hash", AccountRole::LibraryUser)
            .unwrap();
        storage
    }

    #[test]
    fn creates_a_user_with_the_given_role() {
        let storage = Storage::open_in_memory().unwrap();
        let user = storage
            .create_user("admin@example.com", "hash", AccountRole::Administrator)
            .unwrap();
        assert_eq!(user.role, AccountRole::Administrator);
    }

    #[test]
    fn refuses_an_email_taken_in_another_letter_case() {
        let storage = storage_with_user("reader@example.com");
        let again = storage.create_user("Reader@Example.com", "hash", AccountRole::LibraryUser);
        assert!(matches!(again, Err(StorageError::EmailTaken(_))));
    }

    #[test]
    fn finds_a_user_by_email_in_another_letter_case() {
        let storage = storage_with_user("reader@example.com");
        let found = storage.find_user_by_email("READER@example.com").unwrap();
        assert_eq!(
            found.map(|found| found.password_hash),
            Some("hash".to_string())
        );
    }

    #[test]
    fn finds_no_user_for_an_unknown_email() {
        let storage = storage_with_user("reader@example.com");
        assert_eq!(
            storage.find_user_by_email("other@example.com").unwrap(),
            None
        );
    }

    #[test]
    fn lists_users_oldest_first() {
        let storage = storage_with_user("first@example.com");
        storage
            .create_user("second@example.com", "hash", AccountRole::LibraryUser)
            .unwrap();
        let emails: Vec<String> = storage
            .list_users()
            .unwrap()
            .into_iter()
            .map(|user| user.email)
            .collect();
        assert_eq!(emails, ["first@example.com", "second@example.com"]);
    }

    #[test]
    fn sets_a_users_role() {
        let storage = Storage::open_in_memory().unwrap();
        let user = storage
            .create_user("reader@example.com", "hash", AccountRole::LibraryUser)
            .unwrap();
        let updated = storage
            .set_user_role(&user.id, AccountRole::Privileged)
            .unwrap();
        assert_eq!(updated.role, AccountRole::Privileged);
    }

    #[test]
    fn reports_setting_the_role_of_an_unknown_user() {
        let storage = Storage::open_in_memory().unwrap();
        let result = storage.set_user_role("missing", AccountRole::Privileged);
        assert!(matches!(result, Err(StorageError::UserNotFound(_))));
    }

    #[test]
    fn replaces_a_password_hash() {
        let storage = storage_with_user("reader@example.com");
        let id = storage.list_users().unwrap()[0].id.clone();
        storage.set_password_hash(&id, "new hash").unwrap();
        let found = storage.find_user_by_email("reader@example.com").unwrap();
        assert_eq!(
            found.map(|found| found.password_hash),
            Some("new hash".to_string())
        );
    }

    #[test]
    fn replacing_a_password_hash_ends_the_sessions() {
        let storage = storage_with_user("reader@example.com");
        let id = storage.list_users().unwrap()[0].id.clone();
        storage.create_session("token-hash", &id, u64::MAX).unwrap();
        storage.set_password_hash(&id, "new hash").unwrap();
        assert_eq!(storage.find_live_session("token-hash", 0).unwrap(), None);
    }

    #[test]
    fn reports_replacing_the_password_of_an_unknown_user() {
        let storage = Storage::open_in_memory().unwrap();
        let result = storage.set_password_hash("missing", "hash");
        assert!(matches!(result, Err(StorageError::UserNotFound(_))));
    }

    fn storage_with_administrator() -> (Storage, String) {
        let storage = Storage::open_in_memory().unwrap();
        let admin = storage
            .create_user("admin@example.com", "hash", AccountRole::Administrator)
            .unwrap();
        (storage, admin.id)
    }

    #[test]
    fn keeps_the_role_of_the_last_administrator() {
        let (storage, id) = storage_with_administrator();
        let result = storage.set_user_role(&id, AccountRole::Privileged);
        assert!(matches!(result, Err(StorageError::LastAdministrator(_))));
    }

    #[test]
    fn keeps_the_last_administrator() {
        let (storage, id) = storage_with_administrator();
        let result = storage.delete_user(&id);
        assert!(matches!(result, Err(StorageError::LastAdministrator(_))));
    }

    #[test]
    fn demotes_an_administrator_while_another_remains() {
        let (storage, id) = storage_with_administrator();
        storage
            .create_user("second@example.com", "hash", AccountRole::Administrator)
            .unwrap();
        assert!(storage.set_user_role(&id, AccountRole::Privileged).is_ok());
    }

    #[test]
    fn lets_the_last_administrator_stay_an_administrator() {
        let (storage, id) = storage_with_administrator();
        assert!(
            storage
                .set_user_role(&id, AccountRole::Administrator)
                .is_ok()
        );
    }

    #[test]
    fn deletes_a_user() {
        let storage = Storage::open_in_memory().unwrap();
        let user = storage
            .create_user("reader@example.com", "hash", AccountRole::LibraryUser)
            .unwrap();
        storage.delete_user(&user.id).unwrap();
        assert!(storage.list_users().unwrap().is_empty());
    }

    #[test]
    fn reports_deleting_an_unknown_user() {
        let storage = Storage::open_in_memory().unwrap();
        let result = storage.delete_user("missing");
        assert!(matches!(result, Err(StorageError::UserNotFound(_))));
    }
}
