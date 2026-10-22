use lettre::message::Mailbox;
use lettre::message::header::ContentType;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};

use crate::config::{SmtpConfig, SmtpSecurity};
use crate::mail::{MailError, MailSending, Mailer, OutgoingMail};

/// Sends mail through an SMTP server, opening a connection for each mail.
pub struct SmtpMailer {
    transport: AsyncSmtpTransport<Tokio1Executor>,
    from: Mailbox,
}

impl SmtpMailer {
    pub fn open(config: &SmtpConfig, from: Mailbox) -> Result<Self, MailError> {
        let builder = match config.security {
            SmtpSecurity::Tls => AsyncSmtpTransport::<Tokio1Executor>::relay(&config.host)?,
            SmtpSecurity::StartTls => {
                AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&config.host)?
            }
            SmtpSecurity::None => {
                AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&config.host)
            }
        }
        .port(config.port);
        let builder = match &config.credentials {
            Some(credentials) => builder.credentials(Credentials::new(
                credentials.username.clone(),
                credentials.password.clone(),
            )),
            None => builder,
        };
        Ok(Self {
            transport: builder.build(),
            from,
        })
    }

    fn compose(&self, mail: OutgoingMail) -> Result<Message, MailError> {
        let to: Mailbox = mail
            .to
            .parse()
            .map_err(|error: lettre::address::AddressError| {
                MailError::InvalidRecipient(error.to_string())
            })?;
        Ok(Message::builder()
            .from(self.from.clone())
            .to(to)
            .subject(mail.subject)
            .header(ContentType::TEXT_PLAIN)
            .body(mail.text)?)
    }
}

impl Mailer for SmtpMailer {
    fn send(&self, mail: OutgoingMail) -> MailSending<'_> {
        Box::pin(async move {
            let message = self.compose(mail)?;
            self.transport.send(message).await?;
            Ok(())
        })
    }
}
