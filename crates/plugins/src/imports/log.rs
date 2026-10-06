use easyimmerse_core::providers::media_source::ProgressEvent;
use easyimmerse_plugin_api::base::easyimmerse::plugin::log::{
    Host, ProgressEvent as WitProgressEvent,
};

use crate::host_state::{HostEvent, HostState, LogEntry, LogLevel};

impl Host for HostState {
    fn info(&mut self, message: String) -> wasmtime::Result<()> {
        tracing::info!(target: "plugin", "{message}");
        self.push_log(LogLevel::Info, message);
        Ok(())
    }

    fn warn(&mut self, message: String) -> wasmtime::Result<()> {
        tracing::warn!(target: "plugin", "{message}");
        self.push_log(LogLevel::Warn, message);
        Ok(())
    }

    fn error(&mut self, message: String) -> wasmtime::Result<()> {
        tracing::error!(target: "plugin", "{message}");
        self.push_log(LogLevel::Error, message);
        Ok(())
    }

    fn progress(&mut self, event: WitProgressEvent) -> wasmtime::Result<()> {
        tracing::debug!(target: "plugin", fraction = event.fraction, "{}", event.message);
        let event = ProgressEvent {
            fraction: event.fraction,
            message: event.message,
        };
        self.progress.push(event.clone());
        self.emit(HostEvent::Progress(event));
        Ok(())
    }
}

impl HostState {
    fn push_log(&mut self, level: LogLevel, message: String) {
        let entry = LogEntry { level, message };
        self.log.push(entry.clone());
        self.emit(HostEvent::Log(entry));
    }
}
