use easyimmerse_core::providers::media_source::ProgressEvent;
use wasmtime::StoreLimits;
use wasmtime::component::ResourceTable;
use wasmtime_wasi::{WasiCtx, WasiCtxBuilder, WasiCtxView, WasiView};

use crate::grants::CapabilityGrants;
use crate::limits::HostLimits;

/// Everything the host keeps for one plugin instance: the WASI context, the
/// resource limits, the capability grants, what the plugin has reported, and the
/// listener that hears each event as it happens.
pub struct HostState {
    pub wasi: WasiCtx,
    pub table: ResourceTable,
    pub limits: StoreLimits,
    pub download: DownloadLimits,
    pub grants: CapabilityGrants,
    pub log: Vec<LogEntry>,
    pub progress: Vec<ProgressEvent>,
    pub listener: Option<HostListener>,
}

/// The parts of [`HostLimits`] that `http.download` enforces.
#[derive(Debug, Clone, Copy)]
pub struct DownloadLimits {
    pub reserve_bytes: u64,
    pub stall_timeout: std::time::Duration,
}

impl From<&HostLimits> for DownloadLimits {
    fn from(limits: &HostLimits) -> Self {
        Self {
            reserve_bytes: limits.download_reserve_bytes,
            stall_timeout: limits.download_stall_timeout,
        }
    }
}

/// Something that happened during a call into the plugin, reported as it happens.
#[derive(Debug, Clone, PartialEq)]
pub enum HostEvent {
    Log(LogEntry),
    Progress(ProgressEvent),
    /// The plugin asked for a command, which the host is now running.
    CommandStarted {
        command: String,
        args: Vec<String>,
    },
    /// A line the running command wrote to its standard output or error.
    CommandOutput {
        command: String,
        line: String,
    },
    CommandFinished {
        command: String,
        exit_code: i32,
        elapsed_ms: u64,
    },
}

/// Hears each event of a plugin call. It runs on the thread making the call.
pub type HostListener = Box<dyn FnMut(HostEvent) + Send>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LogEntry {
    pub level: LogLevel,
    pub message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogLevel {
    Info,
    Warn,
    Error,
}

impl HostState {
    /// Builds a state whose WASI context inherits nothing from the host process.
    pub fn new(grants: CapabilityGrants) -> Self {
        Self {
            wasi: WasiCtxBuilder::new().build(),
            table: ResourceTable::new(),
            limits: StoreLimits::default(),
            download: DownloadLimits::from(&HostLimits::default()),
            grants,
            log: Vec::new(),
            progress: Vec::new(),
            listener: None,
        }
    }

    /// Hands the event to the listener, when one is installed.
    pub fn emit(&mut self, event: HostEvent) {
        if let Some(listener) = &mut self.listener {
            listener(event);
        }
    }

    /// Removes and returns the log entries collected so far.
    pub fn take_log(&mut self) -> Vec<LogEntry> {
        std::mem::take(&mut self.log)
    }

    /// Removes and returns the progress events collected so far.
    pub fn take_progress(&mut self) -> Vec<ProgressEvent> {
        std::mem::take(&mut self.progress)
    }
}

impl WasiView for HostState {
    fn ctx(&mut self) -> WasiCtxView<'_> {
        WasiCtxView {
            ctx: &mut self.wasi,
            table: &mut self.table,
        }
    }
}
