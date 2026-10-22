//! The mails of the account flows, composed and sent in the background so that no request waits for them.

use std::sync::Arc;

use easyimmerse_core::account::AccountUser;
use easyimmerse_storage::{EmailTokenPurpose, StorageError};

use crate::accounts::issue_email_token;
use crate::mail::{MailLink, MailService, OutgoingMail, confirmation_mail, password_reset_mail};
use crate::now_ms::now_ms;
use crate::state::AppState;

/// Mails the user a link to confirm their email address, when the server sends email.
pub fn send_confirmation_mail(state: &AppState, user: AccountUser) {
    let Some(mail) = state.mail.clone() else {
        return;
    };
    let storage = Arc::clone(&state.storage);
    let links = mail.clone();
    spawn_mail(mail, move || {
        let purpose = EmailTokenPurpose::ConfirmEmail;
        let token = issue_email_token(&storage, &user.id, purpose, now_ms())?;
        let link = links.link(MailLink::ConfirmEmail, &token);
        Ok(Some(confirmation_mail(&user.email, &link)))
    });
}

/// Mails a link to choose a new password to the account with the email address, if there is one,
/// when the server sends email.
pub fn send_password_reset_mail(state: &AppState, email: String) {
    let Some(mail) = state.mail.clone() else {
        return;
    };
    let storage = Arc::clone(&state.storage);
    let links = mail.clone();
    spawn_mail(mail, move || {
        let Some(stored) = storage.find_user_by_email(email.trim())? else {
            return Ok(None);
        };
        let purpose = EmailTokenPurpose::ResetPassword;
        let token = issue_email_token(&storage, &stored.user.id, purpose, now_ms())?;
        let link = links.link(MailLink::ResetPassword, &token);
        Ok(Some(password_reset_mail(&stored.user.email, &link)))
    });
}

/// Composes a mail on the blocking thread pool, since composing it writes to the database, then sends it.
/// Composing yields None when there is no one to send to. Every failure is only logged.
fn spawn_mail(
    mail: MailService,
    compose: impl FnOnce() -> Result<Option<OutgoingMail>, StorageError> + Send + 'static,
) {
    drop(tokio::spawn(async move {
        match tokio::task::spawn_blocking(compose).await {
            Ok(Ok(Some(outgoing))) => mail.send(outgoing).await,
            Ok(Ok(None)) => {}
            Ok(Err(error)) => tracing::warn!("could not prepare a mail: {error}"),
            Err(error) => tracing::warn!("the mail task failed: {error}"),
        }
    }));
}
