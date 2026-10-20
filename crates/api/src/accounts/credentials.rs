//! The rules that email addresses and passwords must follow.

use crate::accounts::error::AccountsError;

pub const MIN_PASSWORD_CHARACTERS: usize = 8;

/// Trims the email address and checks that it has the form `name@domain`.
/// Letter case is kept, since storage compares addresses without regard to it.
pub fn normalized_email(email: &str) -> Result<String, AccountsError> {
    let email = email.trim();
    if is_email_shaped(email) {
        Ok(email.to_string())
    } else {
        Err(AccountsError::InvalidEmail(email.to_string()))
    }
}

pub fn ensure_password_long_enough(password: &str) -> Result<(), AccountsError> {
    if password.chars().count() >= MIN_PASSWORD_CHARACTERS {
        Ok(())
    } else {
        Err(AccountsError::PasswordTooShort)
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
        assert!(ensure_password_long_enough("1234567").is_err());
    }

    #[test]
    fn accepts_an_eight_character_password() {
        assert!(ensure_password_long_enough("12345678").is_ok());
    }
}
