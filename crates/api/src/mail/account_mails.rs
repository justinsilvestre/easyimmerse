//! The texts of the mails that accounts receive.

use crate::mail::OutgoingMail;

pub fn confirmation_mail(to: &str, link: &str) -> OutgoingMail {
    OutgoingMail {
        to: to.to_string(),
        subject: "Confirm your email address for easyImmerse".to_string(),
        text: format!(
            "Follow this link to confirm the email address of your easyImmerse account:\n\n\
             {link}\n\n\
             The link works for 24 hours. If you did not create this account, you can ignore this email.\n"
        ),
    }
}

pub fn password_reset_mail(to: &str, link: &str) -> OutgoingMail {
    OutgoingMail {
        to: to.to_string(),
        subject: "Choose a new easyImmerse password".to_string(),
        text: format!(
            "Someone asked to reset the password of the easyImmerse account with this email address. \
             Follow this link to choose a new password:\n\n\
             {link}\n\n\
             The link works for one hour. Choosing a new password logs you out on every other device. \
             If you did not ask for this, you can ignore this email, and your password stays the same.\n"
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_confirmation_mail_carries_its_link() {
        let mail = confirmation_mail(
            "reader@example.com",
            "https://example.com/?confirm_email=abc",
        );
        assert!(
            mail.text
                .contains("https://example.com/?confirm_email=abc\n")
        );
    }

    #[test]
    fn a_reset_mail_carries_its_link() {
        let mail = password_reset_mail(
            "reader@example.com",
            "https://example.com/?reset_password=abc",
        );
        assert!(
            mail.text
                .contains("https://example.com/?reset_password=abc\n")
        );
    }
}
