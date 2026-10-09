use easyimmerse_plugin_api::media_source_fixture::MediaSourceFixture;
use wasmtime::Store;

use crate::compiled_plugin::CompiledPlugin;
use crate::error::{PluginError, PluginErrorKind};
use crate::grants::CapabilityGrants;
use crate::host_state::HostState;
use crate::limits::{HostLimits, reset_fuel};
use crate::media_source_plugin::to_error_kind;

/// A loaded plugin of the test-only `media-source-fixture` world, through its
/// `sandbox-probe` export. The host tests use it to check which commands, hosts and paths
/// the sandbox lets a plugin reach; the `media-source` export of the same component
/// is loaded through `MediaSourcePlugin`.
pub struct MediaSourceFixturePlugin {
    store: Store<HostState>,
    bindings: MediaSourceFixture,
    limits: HostLimits,
}

impl MediaSourceFixturePlugin {
    pub fn instantiate(
        compiled: &CompiledPlugin,
        grants: CapabilityGrants,
        limits: HostLimits,
    ) -> Result<Self, PluginError> {
        let mut store = compiled.new_store(grants, &limits)?;
        let bindings =
            MediaSourceFixture::instantiate(&mut store, &compiled.component, &compiled.linker)?;
        Ok(Self {
            store,
            bindings,
            limits,
        })
    }

    /// Asks the plugin to run `command`, returning the error the host gave it.
    pub fn probe_run(&mut self, command: &str) -> Result<Result<(), PluginErrorKind>, PluginError> {
        reset_fuel(&mut self.store, &self.limits)?;
        let outcome = self
            .bindings
            .easyimmerse_plugin_sandbox_probe()
            .call_try_run(&mut self.store, command)?;
        Ok(outcome.map_err(to_error_kind))
    }

    /// Asks the plugin to fetch `url`, returning the error the host gave it.
    pub fn probe_get(&mut self, url: &str) -> Result<Result<(), PluginErrorKind>, PluginError> {
        reset_fuel(&mut self.store, &self.limits)?;
        let outcome = self
            .bindings
            .easyimmerse_plugin_sandbox_probe()
            .call_try_get(&mut self.store, url)?;
        Ok(outcome.map_err(to_error_kind))
    }

    /// Asks the plugin to download `url` into `path`, returning the byte count or
    /// the error the host gave it.
    pub fn probe_download(
        &mut self,
        url: &str,
        path: &str,
    ) -> Result<Result<u64, PluginErrorKind>, PluginError> {
        reset_fuel(&mut self.store, &self.limits)?;
        let outcome = self
            .bindings
            .easyimmerse_plugin_sandbox_probe()
            .call_try_download(&mut self.store, url, path)?;
        Ok(outcome.map_err(to_error_kind))
    }
}
