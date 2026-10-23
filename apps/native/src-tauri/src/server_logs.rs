//! Keeps the most recent log records in memory, so that the server settings can show them.

use std::collections::VecDeque;
use std::fmt::Write;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use easyimmerse_api::server_control::{LogLevel, ServerLogEntry};
use tracing::field::{Field, Visit};
use tracing::{Event, Level, Subscriber};
use tracing_subscriber::filter::Targets;
use tracing_subscriber::layer::{Context, Layer};
use tracing_subscriber::registry::LookupSpan;

/// How many records the buffer keeps before dropping the oldest.
pub const KEPT_RECORD_COUNT: usize = 500;
/// The prefix of the targets of the app's own crates.
const OWN_TARGET_PREFIX: &str = "easyimmerse";

/// The most recent log records, oldest first. Clones share the same records.
#[derive(Clone, Default)]
pub struct ServerLogs {
    records: Arc<Mutex<VecDeque<ServerLogEntry>>>,
}

impl ServerLogs {
    /// Returns a copy of the kept records, oldest first.
    pub fn entries(&self) -> Vec<ServerLogEntry> {
        self.records
            .lock()
            .map(|records| records.iter().cloned().collect())
            .unwrap_or_default()
    }

    fn push(&self, entry: ServerLogEntry) {
        let Ok(mut records) = self.records.lock() else {
            return;
        };
        if records.len() == KEPT_RECORD_COUNT {
            records.pop_front();
        }
        records.push_back(entry);
    }

    /// The layer that fills this buffer with the records [`kept_records`] selects.
    pub fn layer<S>(&self) -> impl Layer<S>
    where
        S: Subscriber + for<'span> LookupSpan<'span>,
    {
        ServerLogLayer { logs: self.clone() }.with_filter(kept_records())
    }
}

/// Info and above from the app's own crates, and warnings and errors from everything else.
pub fn kept_records() -> Targets {
    Targets::new()
        .with_default(Level::WARN)
        .with_target(OWN_TARGET_PREFIX, Level::INFO)
}

struct ServerLogLayer {
    logs: ServerLogs,
}

impl<S: Subscriber> Layer<S> for ServerLogLayer {
    fn on_event(&self, event: &Event<'_>, _context: Context<'_, S>) {
        let mut message = MessageText::default();
        event.record(&mut message);
        let metadata = event.metadata();
        self.logs.push(ServerLogEntry {
            time_ms: now_ms(),
            level: log_level(*metadata.level()),
            target: metadata.target().to_string(),
            message: message.0,
        });
    }
}

/// The event's message followed by its other fields as `name=value`.
#[derive(Default)]
struct MessageText(String);

impl Visit for MessageText {
    fn record_debug(&mut self, field: &Field, value: &dyn std::fmt::Debug) {
        let separator = if self.0.is_empty() { "" } else { " " };
        let _ = if field.name() == "message" {
            write!(self.0, "{separator}{value:?}")
        } else {
            write!(self.0, "{separator}{}={value:?}", field.name())
        };
    }

    fn record_str(&mut self, field: &Field, value: &str) {
        if field.name() == "message" {
            self.record_debug(field, &format_args!("{value}"));
        } else {
            self.record_debug(field, &value);
        }
    }
}

fn log_level(level: Level) -> LogLevel {
    match level {
        Level::ERROR => LogLevel::Error,
        Level::WARN => LogLevel::Warn,
        Level::INFO => LogLevel::Info,
        Level::DEBUG => LogLevel::Debug,
        Level::TRACE => LogLevel::Trace,
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| elapsed.as_millis() as u64)
}

#[cfg(test)]
mod tests {
    use tracing_subscriber::layer::SubscriberExt;

    use super::*;

    fn entry(message: &str) -> ServerLogEntry {
        ServerLogEntry {
            time_ms: 0,
            level: LogLevel::Info,
            target: "easyimmerse_api".to_string(),
            message: message.to_string(),
        }
    }

    fn logs_after(count: usize) -> Vec<ServerLogEntry> {
        let logs = ServerLogs::default();
        for index in 0..count {
            logs.push(entry(&index.to_string()));
        }
        logs.entries()
    }

    #[test]
    fn keeps_at_most_the_bound() {
        assert_eq!(logs_after(KEPT_RECORD_COUNT + 3).len(), KEPT_RECORD_COUNT);
    }

    #[test]
    fn drops_the_oldest_record_first() {
        assert_eq!(logs_after(KEPT_RECORD_COUNT + 3)[0].message, "3");
    }

    #[test]
    fn keeps_info_from_the_app_crates() {
        assert!(kept_records().would_enable("easyimmerse_api::serve", &Level::INFO));
    }

    #[test]
    fn drops_debug_from_the_app_crates() {
        assert!(!kept_records().would_enable("easyimmerse_api::serve", &Level::DEBUG));
    }

    #[test]
    fn drops_info_from_other_crates() {
        assert!(!kept_records().would_enable("hyper::server", &Level::INFO));
    }

    #[test]
    fn keeps_warnings_from_other_crates() {
        assert!(kept_records().would_enable("hyper::server", &Level::WARN));
    }

    fn record_through_the_layer(record: impl FnOnce()) -> Vec<ServerLogEntry> {
        let logs = ServerLogs::default();
        let subscriber = tracing_subscriber::registry().with(logs.layer());
        tracing::subscriber::with_default(subscriber, record);
        logs.entries()
    }

    #[test]
    fn writes_the_message_and_then_the_other_fields() {
        let entries = record_through_the_layer(|| {
            tracing::warn!(target: "easyimmerse_api", port = 8787, "could not bind");
        });
        assert_eq!(entries[0].message, "could not bind port=8787");
    }

    #[test]
    fn leaves_out_a_record_the_filter_drops() {
        let entries = record_through_the_layer(|| {
            tracing::info!(target: "hyper::server", "accepted");
        });
        assert!(entries.is_empty());
    }
}
