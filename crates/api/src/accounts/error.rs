use axum::http::StatusCode;
use easyimmerse_storage::StorageError;
use thiserror::Error;

use crate::accounts::credentials::MIN_PASSWORD_CHARACTERS;
use crate::auth::error_body::ApiFailure;

#[derive(Debug, Error)]
pub enum AccountsError {
    #[error("{0:?} is not an email address")]
    InvalidEmail(String),
    #[error("a password must be at least {MIN_PASSWORD_CHARACTERS} characters long")]
    PasswordTooShort,
    #[error("an account already has the email address {0:?}")]
    EmailTaken(String),
    #[error("the email address or the password is wrong")]
    InvalidCredentials,
    #[error("too many failed logins; try again in {retry_after_secs} seconds")]
    TooManyAttempts { retry_after_secs: u64 },
    #[error("could not hash the password: {0}")]
    Hashing(String),
    #[error(transparent)]
    Storage(StorageError),
}

impl From<StorageError> for AccountsError {
    fn from(error: StorageError) -> Self {
        match error {
            StorageError::EmailTaken(email) => Self::EmailTaken(email),
            other => Self::Storage(other),
        }
    }
}

impl From<AccountsError> for ApiFailure {
    fn from(error: AccountsError) -> Self {
        let message = error.to_string();
        match error {
            AccountsError::InvalidEmail(_) => {
                ApiFailure::new(StatusCode::BAD_REQUEST, "invalid_email", message)
            }
            AccountsError::PasswordTooShort => {
                ApiFailure::new(StatusCode::BAD_REQUEST, "password_too_short", message)
            }
            AccountsError::EmailTaken(_) => {
                ApiFailure::new(StatusCode::CONFLICT, "email_taken", message)
            }
            AccountsError::InvalidCredentials => {
                ApiFailure::new(StatusCode::UNAUTHORIZED, "invalid_credentials", message)
            }
            AccountsError::TooManyAttempts { retry_after_secs } => {
                ApiFailure::new(StatusCode::TOO_MANY_REQUESTS, "too_many_attempts", message)
                    .with_retry_after(retry_after_secs)
            }
            AccountsError::Hashing(_) => crate::auth::error_body::internal(message),
            AccountsError::Storage(error) => error.into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_taken_email_in_storage_becomes_email_taken() {
        let error = AccountsError::from(StorageError::EmailTaken("a@example.com".to_string()));
        assert!(matches!(error, AccountsError::EmailTaken(_)));
    }

    #[test]
    fn wrong_credentials_are_unauthorized() {
        let failure = ApiFailure::from(AccountsError::InvalidCredentials);
        assert_eq!(failure.status, StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn too_many_attempts_tells_when_to_retry() {
        let failure = ApiFailure::from(AccountsError::TooManyAttempts {
            retry_after_secs: 60,
        });
        assert_eq!(failure.retry_after_secs, Some(60));
    }

    #[test]
    fn a_short_password_has_its_own_code() {
        let failure = ApiFailure::from(AccountsError::PasswordTooShort);
        assert_eq!(failure.error.code, "password_too_short");
    }
}
