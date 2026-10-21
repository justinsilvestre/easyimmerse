//! The rules that email addresses and passwords must follow.

use crate::accounts::error::AccountsError;

pub const MIN_PASSWORD_CHARACTERS: usize = 8;
/// The longest email address that SMTP can deliver to.
pub const MAX_EMAIL_CHARACTERS: usize = 254;
/// Bounds the work of hashing a password.
pub const MAX_PASSWORD_BYTES: usize = 1024;

/// Checks that neither the email address nor the password is too long to be worth hashing or counting.
pub fn ensure_credentials_bounded(email: &str, password: &str) -> Result<(), AccountsError> {
    if email.trim().chars().count() > MAX_EMAIL_CHARACTERS {
        return Err(AccountsError::EmailTooLong);
    }
    if password.len() > MAX_PASSWORD_BYTES {
        return Err(AccountsError::PasswordTooLong);
    }
    Ok(())
}

/// Trims the email address and checks that it has the form `name@domain`.
/// Letter case is kept, since storage compares addresses without regard to it.
pub fn normalized_email(email: &str) -> Result<String, AccountsError> {
    let email = email.trim();
    if email.chars().count() > MAX_EMAIL_CHARACTERS {
        Err(AccountsError::EmailTooLong)
    } else if is_email_shaped(email) {
        Ok(email.to_string())
    } else {
        Err(AccountsError::InvalidEmail(email.to_string()))
    }
}

/// Checks that a new password is at least eight characters long, and not too long to hash.
pub fn ensure_password_acceptable(password: &str) -> Result<(), AccountsError> {
    if password.len() > MAX_PASSWORD_BYTES {
        Err(AccountsError::PasswordTooLong)
    } else if password.chars().count() < MIN_PASSWORD_CHARACTERS {
        Err(AccountsError::PasswordTooShort)
    } else {
        Ok(())
    }
}

fn is_email_shaped(email: &str) -> bool {
    let Some((name, domain)) = email.split_once('@') else {
        return false;
    };
    !name.is_empty()
        && !domain.is_empty()
        && !domain.contains('@')
        && !email.chars().any(char::is_whitespace)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trims_an_email_address() {
        assert_eq!(
            normalized_email("  reader@example.com ").unwrap(),
            "reader@example.com"
        );
    }

    #[test]
    fn refuses_an_address_without_an_at_sign() {
        assert!(normalized_email("reader.example.com").is_err());
    }

    #[test]
    fn refuses_an_address_without_a_domain() {
        assert!(normalized_email("reader@").is_err());
    }

    #[test]
    fn refuses_an_address_with_inner_whitespace() {
        assert!(normalized_email("a reader@example.com").is_err());
    }

    #[test]
    fn refuses_a_seven_character_password() {
        assert!(ensure_password_acceptable("1234567").is_err());
    }

    #[test]
    fn refuses_a_new_password_over_1024_bytes() {
        let password = "a".repeat(MAX_PASSWORD_BYTES + 1);
        assert!(matches!(
            ensure_password_acceptable(&password),
            Err(AccountsError::PasswordTooLong)
        ));
    }

    #[test]
    fn refuses_an_address_over_254_characters() {
        let email = format!("{}@example.com", "a".repeat(250));
        assert!(matches!(
            normalized_email(&email),
            Err(AccountsError::EmailTooLong)
        ));
    }

    #[test]
    fn bounds_the_password_of_a_login() {
        let password = "a".repeat(MAX_PASSWORD_BYTES + 1);
        assert!(ensure_credentials_bounded("reader@example.com", &password).is_err());
    }

    #[test]
    fn accepts_bounded_login_credentials() {
        assert!(ensure_credentials_bounded("reader@example.com", "anything").is_ok());
    }

    #[test]
    fn accepts_an_eight_character_password() {
        assert!(ensure_password_acceptable("12345678").is_ok());
    }
}
