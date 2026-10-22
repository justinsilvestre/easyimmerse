use std::sync::{Arc, Mutex, MutexGuard, PoisonError};

use crate::mail::{MailSending, Mailer, OutgoingMail};

/// The mails sent through a recording transport, shared by every clone.
#[derive(Debug, Clone, Default)]
pub struct RecordedMails {
    mails: Arc<Mutex<Vec<OutgoingMail>>>,
}

impl RecordedMails {
    /// Every mail sent so far, oldest first.
    pub fn sent(&self) -> Vec<OutgoingMail> {
        self.locked().clone()
    }

    /// A panic while the list was held leaves it consistent, so its lock is used even when poisoned.
    fn locked(&self) -> MutexGuard<'_, Vec<OutgoingMail>> {
        self.mails.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

/// Two values are equal when they share one list.
impl PartialEq for RecordedMails {
    fn eq(&self, other: &Self) -> bool {
        Arc::ptr_eq(&self.mails, &other.mails)
    }
}

impl Eq for RecordedMails {}

impl Mailer for RecordedMails {
    fn send(&self, mail: OutgoingMail) -> MailSending<'_> {
        self.locked().push(mail);
        Box::pin(async { Ok(()) })
    }
}
