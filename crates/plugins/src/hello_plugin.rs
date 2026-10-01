use easyimmerse_plugin_api::hello::HelloPlugin as HelloBindings;
use wasmtime::Store;

use crate::compiled_plugin::CompiledPlugin;
use crate::error::PluginError;
use crate::execution_mode::ExecutionMode;
use crate::grants::CapabilityGrants;
use crate::host_state::{HostState, LogEntry};
use crate::limits::{HostLimits, reset_fuel};
use crate::package::PluginPackage;

/// A loaded plugin of the test-only `hello-plugin` world.
pub struct HelloPlugin {
    store: Store<HostState>,
    bindings: HelloBindings,
    limits: HostLimits,
}

impl HelloPlugin {
    /// Compiles and instantiates the plugin in one step.
    pub fn load(
        package: &PluginPackage,
        mode: ExecutionMode,
        limits: HostLimits,
    ) -> Result<Self, PluginError> {
        Self::instantiate(&CompiledPlugin::compile(package, mode)?, limits)
    }

    pub fn instantiate(compiled: &CompiledPlugin, limits: HostLimits) -> Result<Self, PluginError> {
        let mut store = compiled.new_store(CapabilityGrants::default(), &limits)?;
        let bindings =
            HelloBindings::instantiate(&mut store, &compiled.component, &compiled.linker)?;
        Ok(Self {
            store,
            bindings,
            limits,
        })
    }

    /// Calls `greet` and returns the greeting with the log entries it produced.
    pub fn greet(&mut self, name: &str) -> Result<(String, Vec<LogEntry>), PluginError> {
        reset_fuel(&mut self.store, &self.limits)?;
        let greeting = self
            .bindings
            .easyimmerse_plugin_hello()
            .call_greet(&mut self.store, name)?;
        Ok((greeting, self.store.data_mut().take_log()))
    }

    /// Calls `loop-forever`, which returns only when the fuel limit stops it.
    pub fn loop_forever(&mut self) -> Result<(), PluginError> {
        reset_fuel(&mut self.store, &self.limits)?;
        self.bindings
            .easyimmerse_plugin_hello()
            .call_loop_forever(&mut self.store)?;
        Ok(())
    }
}
