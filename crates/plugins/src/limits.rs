use std::path::Path;
use std::time::Duration;

use wasmtime::{Store, StoreLimitsBuilder};

use crate::error::PluginError;
use crate::host_state::HostState;

const MEBIBYTE: usize = 1024 * 1024;
const GIBIBYTE: u64 = 1024 * 1024 * 1024;

/// Reports the bytes available to a download in the given directory.
pub type FreeSpaceLookup = fn(&Path) -> std::io::Result<u64>;

/// The bounds on one plugin instance. The memory limit applies to the whole
/// instance. Fuel is a count of executed instructions: `fuel` is the budget
/// for each call into the plugin, and `instantiation_fuel` the budget for
/// instantiation, which is larger because a plugin written in JavaScript
/// starts its engine at that point.
#[derive(Debug, Clone, Copy)]
pub struct HostLimits {
    pub memory_bytes: usize,
    pub fuel: u64,
    pub instantiation_fuel: u64,
    pub download: DownloadLimits,
}

impl Default for HostLimits {
    fn default() -> Self {
        Self {
            memory_bytes: 64 * MEBIBYTE,
            fuel: 100_000_000,
            instantiation_fuel: 50_000_000,
            download: DownloadLimits::default(),
        }
    }
}

/// The limits `http.download` enforces. They protect the device rather than bound the
/// transfer: `reserve_bytes` is the free space a download must leave on the destination's
/// volume, and `stall_timeout` is how long a download may go without receiving a byte.
/// `space_check_interval_bytes` is how many bytes are written between two looks at the free
/// space, which `free_space` reads. Neither limit caps the size or the total duration of a download.
#[derive(Debug, Clone, Copy)]
pub struct DownloadLimits {
    pub reserve_bytes: u64,
    pub stall_timeout: Duration,
    pub space_check_interval_bytes: u64,
    pub free_space: FreeSpaceLookup,
}

impl Default for DownloadLimits {
    fn default() -> Self {
        Self {
            reserve_bytes: 2 * GIBIBYTE,
            stall_timeout: Duration::from_secs(60),
            space_check_interval_bytes: 8 * MEBIBYTE as u64,
            free_space: free_space_on_disk,
        }
    }
}

/// Reads the free space of the volume holding `directory` from the operating system.
fn free_space_on_disk(directory: &Path) -> std::io::Result<u64> {
    fs4::available_space(directory)
}

/// Installs the memory limiter on the store and gives it the instantiation fuel budget.
pub fn apply_limits(store: &mut Store<HostState>, limits: &HostLimits) -> Result<(), PluginError> {
    store.data_mut().limits = StoreLimitsBuilder::new()
        .memory_size(limits.memory_bytes)
        .build();
    store.data_mut().download = limits.download;
    store.limiter(|state| &mut state.limits);
    store.set_fuel(limits.instantiation_fuel)?;
    Ok(())
}

/// Gives the store the per-call fuel budget, discarding whatever was left from the last call.
pub fn reset_fuel(store: &mut Store<HostState>, limits: &HostLimits) -> Result<(), PluginError> {
    store.set_fuel(limits.fuel)?;
    Ok(())
}
