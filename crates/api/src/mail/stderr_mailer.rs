use std::io::Write;

use lettre::message::Mailbox;

use crate::mail::{MailSending, Mailer, OutgoingMail};

/// Writes each mail to standard error instead of sending it, for development.
pub struct StderrMailer {
    pub from: Mailbox,
}

impl Mailer for StderrMailer {
    fn send(&self, mail: OutgoingMail) -> MailSending<'_> {
        let printed = format!(
            "--- mail\nFrom: {}\nTo: {}\nSubject: {}\n\n{}\n---\n",
            self.from, mail.to, mail.subject, mail.text
        );
        // Standard error is the only destination; a failed write has nowhere better to be reported.
        let _ = std::io::stderr().lock().write_all(printed.as_bytes());
        Box::pin(async { Ok(()) })
    }
}
