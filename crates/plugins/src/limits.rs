use std::time::Duration;

use wasmtime::{Store, StoreLimitsBuilder};

use crate::error::PluginError;
use crate::host_state::{DownloadLimits, HostState};

const MEBIBYTE: usize = 1024 * 1024;
const GIBIBYTE: u64 = 1024 * 1024 * 1024;

/// The bounds on one plugin instance. The memory limit applies to the whole
/// instance. Fuel is a count of executed instructions: `fuel` is the budget
/// for each call into the plugin, and `instantiation_fuel` the budget for
/// instantiation, which is larger because a plugin written in JavaScript
/// starts its engine at that point. The download limits protect the device
/// rather than bound the transfer: `download_reserve_bytes` is the free space
/// a download must leave on the destination's volume, and
/// `download_stall_timeout` is how long a download may go without receiving a
/// byte. Neither caps the size or the total duration of a download.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HostLimits {
    pub memory_bytes: usize,
    pub fuel: u64,
    pub instantiation_fuel: u64,
    pub download_reserve_bytes: u64,
    pub download_stall_timeout: Duration,
}

impl Default for HostLimits {
    fn default() -> Self {
        Self {
            memory_bytes: 64 * MEBIBYTE,
            fuel: 100_000_000,
            instantiation_fuel: 50_000_000,
            download_reserve_bytes: 2 * GIBIBYTE,
            download_stall_timeout: Duration::from_secs(60),
        }
    }
}

/// Installs the memory limiter on the store and gives it the instantiation fuel budget.
pub fn apply_limits(store: &mut Store<HostState>, limits: &HostLimits) -> Result<(), PluginError> {
    store.data_mut().limits = StoreLimitsBuilder::new()
        .memory_size(limits.memory_bytes)
        .build();
    store.data_mut().download = DownloadLimits::from(limits);
    store.limiter(|state| &mut state.limits);
    store.set_fuel(limits.instantiation_fuel)?;
    Ok(())
}

/// Gives the store the per-call fuel budget, discarding whatever was left from the last call.
pub fn reset_fuel(store: &mut Store<HostState>, limits: &HostLimits) -> Result<(), PluginError> {
    store.set_fuel(limits.fuel)?;
    Ok(())
}
