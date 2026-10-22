//! Sending email, which a server needs to confirm addresses and to reset passwords.
//! Mail goes out in the background, so that no request waits for it or fails because of it.

mod account_mails;
mod mail_links;
mod recorded_mails;
mod smtp_mailer;
mod stderr_mailer;

pub use account_mails::{confirmation_mail, password_reset_mail};
pub use mail_links::MailLink;
pub use recorded_mails::RecordedMails;

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use lettre::message::Mailbox;
use thiserror::Error;

use crate::config::{MailConfig, MailTransport};
use mail_links::PublicUrl;
use smtp_mailer::SmtpMailer;
use stderr_mailer::StderrMailer;

/// A plain-text mail to one recipient. The sender is the configured from address.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OutgoingMail {
    pub to: String,
    pub subject: String,
    pub text: String,
}

#[derive(Debug, Error)]
pub enum MailError {
    #[error("the mail sender {address:?} is not an email address: {reason}")]
    InvalidFromAddress { address: String, reason: String },
    #[error(
        "the public URL {0:?} must start with http:// or https://, name a host, and have no query or fragment"
    )]
    InvalidPublicUrl(String),
    #[error("the recipient is not an email address: {0}")]
    InvalidRecipient(String),
    #[error("could not compose the mail: {0}")]
    Composing(#[from] lettre::error::Error),
    #[error("the SMTP server failed: {0}")]
    Smtp(#[from] lettre::transport::smtp::Error),
}

/// The work of sending one mail.
pub type MailSending<'a> = Pin<Box<dyn Future<Output = Result<(), MailError>> + Send + 'a>>;

/// Delivers mail, or pretends to.
pub trait Mailer: Send + Sync {
    fn send(&self, mail: OutgoingMail) -> MailSending<'_>;
}

/// Sends mail with the configured transport and builds the links that mails carry.
#[derive(Clone)]
pub struct MailService {
    mailer: Arc<dyn Mailer>,
    public_url: PublicUrl,
}

impl MailService {
    /// Checks the addresses in the configuration and prepares its transport, without connecting to anything.
    pub fn open(config: &MailConfig) -> Result<Self, MailError> {
        let from = parse_from_address(&config.from_address)?;
        let public_url = PublicUrl::parse(&config.public_url)?;
        let mailer: Arc<dyn Mailer> = match &config.transport {
            MailTransport::Smtp(smtp) => Arc::new(SmtpMailer::open(smtp, from)?),
            MailTransport::Stderr => Arc::new(StderrMailer { from }),
            MailTransport::Recording(recorded) => Arc::new(recorded.clone()),
        };
        Ok(Self { mailer, public_url })
    }

    /// The address of the web app that acts on the token.
    pub fn link(&self, link: MailLink, token: &str) -> String {
        self.public_url.link(link, token)
    }

    /// Sends the mail, logging a failure rather than returning it.
    pub async fn send(&self, mail: OutgoingMail) {
        if let Err(error) = self.mailer.send(mail).await {
            tracing::warn!("could not send a mail: {error}");
        }
    }
}

/// Checks the from address and the public URL of the configuration, as opening a service does.
pub fn check_mail_config(config: &MailConfig) -> Result<(), MailError> {
    parse_from_address(&config.from_address)?;
    PublicUrl::parse(&config.public_url).map(|_| ())
}

fn parse_from_address(address: &str) -> Result<Mailbox, MailError> {
    address.parse().map_err(
        |error: lettre::address::AddressError| MailError::InvalidFromAddress {
            address: address.to_string(),
            reason: error.to_string(),
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config(from_address: &str, public_url: &str) -> MailConfig {
        MailConfig {
            transport: MailTransport::Stderr,
            from_address: from_address.to_string(),
            public_url: public_url.to_string(),
        }
    }

    #[test]
    fn accepts_a_named_from_address() {
        let config = config("easyImmerse <accounts@example.com>", "https://example.com");
        assert!(check_mail_config(&config).is_ok());
    }

    #[test]
    fn refuses_a_from_address_without_an_at_sign() {
        let config = config("accounts", "https://example.com");
        assert!(matches!(
            check_mail_config(&config),
            Err(MailError::InvalidFromAddress { .. })
        ));
    }

    #[test]
    fn refuses_a_public_url_without_a_scheme() {
        let config = config("accounts@example.com", "example.com");
        assert!(matches!(
            check_mail_config(&config),
            Err(MailError::InvalidPublicUrl(_))
        ));
    }

    #[tokio::test]
    async fn a_recording_transport_keeps_what_is_sent() {
        let recorded = RecordedMails::default();
        let config = MailConfig {
            transport: MailTransport::Recording(recorded.clone()),
            ..config("accounts@example.com", "https://example.com")
        };
        let mail = OutgoingMail {
            to: "reader@example.com".to_string(),
            subject: "Hello".to_string(),
            text: "Hi".to_string(),
        };
        MailService::open(&config).unwrap().send(mail.clone()).await;
        assert_eq!(recorded.sent(), [mail]);
    }
}
