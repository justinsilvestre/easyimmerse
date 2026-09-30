use easyimmerse_core::providers::media_source::ProgressEvent;
use wasmtime::StoreLimits;
use wasmtime::component::ResourceTable;
use wasmtime_wasi::{WasiCtx, WasiCtxBuilder, WasiCtxView, WasiView};

use crate::grants::CapabilityGrants;

/// Everything the host keeps for one plugin instance: the WASI context, the
/// resource limits, the capability grants, and what the plugin has reported.
pub struct HostState {
    pub wasi: WasiCtx,
    pub table: ResourceTable,
    pub limits: StoreLimits,
    pub grants: CapabilityGrants,
    pub log: Vec<LogEntry>,
    pub progress: Vec<ProgressEvent>,
}

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
            grants,
            log: Vec::new(),
            progress: Vec::new(),
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
