//! Keeps an account from being sent more than one confirmation mail a minute.

use std::collections::HashMap;
use std::sync::{Mutex, MutexGuard, PoisonError};

use crate::accounts::error::AccountsError;

const RESEND_INTERVAL_MS: u64 = 60 * 1000;

/// When each account was last sent a confirmation mail, within the last minute, kept in memory.
#[derive(Debug, Default)]
pub struct MailThrottle {
    sent_at_ms: Mutex<HashMap<String, u64>>,
}

impl MailThrottle {
    /// Counts a mail to the user, or fails with `MailSentRecently` without counting it
    /// when the user was sent one less than a minute before `now_ms`.
    pub fn begin_mail(&self, user_id: &str, now_ms: u64) -> Result<(), AccountsError> {
        let mut sent_at_ms = self.locked();
        sent_at_ms.retain(|_, at_ms| now_ms < at_ms.saturating_add(RESEND_INTERVAL_MS));
        if let Some(at_ms) = sent_at_ms.get(user_id) {
            let retry_after_ms = at_ms.saturating_add(RESEND_INTERVAL_MS) - now_ms;
            return Err(AccountsError::MailSentRecently {
                retry_after_secs: retry_after_ms.div_ceil(1000),
            });
        }
        sent_at_ms.insert(user_id.to_string(), now_ms);
        Ok(())
    }

    /// A panic while the map was held leaves it consistent, so its lock is used even when poisoned.
    fn locked(&self) -> MutexGuard<'_, HashMap<String, u64>> {
        self.sent_at_ms
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn throttle_after_mail_at(at_ms: u64) -> MailThrottle {
        let throttle = MailThrottle::default();
        throttle.begin_mail("u", at_ms).unwrap();
        throttle
    }

    #[test]
    fn refuses_a_second_mail_within_a_minute() {
        let throttle = throttle_after_mail_at(1_000);
        assert!(matches!(
            throttle.begin_mail("u", 30_000),
            Err(AccountsError::MailSentRecently {
                retry_after_secs: 31
            })
        ));
    }

    #[test]
    fn allows_a_second_mail_after_a_minute() {
        let throttle = throttle_after_mail_at(1_000);
        assert!(throttle.begin_mail("u", 61_000).is_ok());
    }

    #[test]
    fn allows_a_mail_to_another_user() {
        let throttle = throttle_after_mail_at(1_000);
        assert!(throttle.begin_mail("other", 2_000).is_ok());
    }
}
