use std::collections::HashMap;

use wasmtime::component::{Component, Linker};
use wasmtime::{Engine, Store};

use crate::engine::build_engine;
use crate::error::PluginError;
use crate::execution_mode::ExecutionMode;
use crate::grants::CapabilityGrants;
use crate::host_state::HostState;
use crate::limits::{HostLimits, apply_limits};
use crate::linker::new_linker;
use crate::package::PluginPackage;

/// A plugin component compiled for one execution mode. Compiling is the
/// expensive step, so one `CompiledPlugin` can be instantiated many times.
pub struct CompiledPlugin {
    pub engine: Engine,
    pub component: Component,
    pub linker: Linker<HostState>,
}

impl CompiledPlugin {
    pub fn compile(package: &PluginPackage, mode: ExecutionMode) -> Result<Self, PluginError> {
        let engine = build_engine(mode)?;
        let component = Component::from_file(&engine, &package.wasm_path)?;
        let linker = new_linker(&engine)?;
        Ok(Self {
            engine,
            component,
            linker,
        })
    }

    /// Creates a store for a new instance, with the limits applied and the
    /// instantiation fuel budget in place.
    pub fn new_store(
        &self,
        grants: CapabilityGrants,
        limits: &HostLimits,
    ) -> Result<Store<HostState>, PluginError> {
        let mut store = Store::new(&self.engine, HostState::new(grants, HashMap::new()));
        apply_limits(&mut store, limits)?;
        Ok(store)
    }
}
