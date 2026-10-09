use wasmtime::{Store, StoreLimitsBuilder};

use crate::error::PluginError;
use crate::host_state::HostState;

const MEBIBYTE: usize = 1024 * 1024;

/// The bounds on one plugin instance. The memory limit applies to the whole
/// instance. Fuel is a count of executed instructions: `fuel` is the budget
/// for each call into the plugin, and `instantiation_fuel` the budget for
/// instantiation, which is larger because a plugin written in JavaScript
/// starts its engine at that point.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HostLimits {
    pub memory_bytes: usize,
    pub fuel: u64,
    pub instantiation_fuel: u64,
}

impl Default for HostLimits {
    fn default() -> Self {
        Self {
            memory_bytes: 64 * MEBIBYTE,
            fuel: 100_000_000,
            instantiation_fuel: 50_000_000,
        }
    }
}

/// Installs the memory limiter on the store and gives it the instantiation fuel budget.
pub fn apply_limits(store: &mut Store<HostState>, limits: &HostLimits) -> Result<(), PluginError> {
    store.data_mut().limits = StoreLimitsBuilder::new()
        .memory_size(limits.memory_bytes)
        .build();
    store.limiter(|state| &mut state.limits);
    store.set_fuel(limits.instantiation_fuel)?;
    Ok(())
}

/// Gives the store the per-call fuel budget, discarding whatever was left from the last call.
pub fn reset_fuel(store: &mut Store<HostState>, limits: &HostLimits) -> Result<(), PluginError> {
    store.set_fuel(limits.fuel)?;
    Ok(())
}
