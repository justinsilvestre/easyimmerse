use easyimmerse_core::providers::media_source::{ProgressEvent, ResolvedMedia};
use easyimmerse_plugin_api::base::easyimmerse::plugin::types::{
    PluginError as WitPluginError, ResolvedMedia as WitResolvedMedia,
};
use easyimmerse_plugin_api::media_source_fixture::MediaSourceFixture;
use wasmtime::Store;

use crate::compiled_plugin::CompiledPlugin;
use crate::error::{PluginError, PluginErrorKind};
use crate::execution_mode::ExecutionMode;
use crate::grants::CapabilityGrants;
use crate::host_state::HostState;
use crate::limits::{HostLimits, reset_fuel};
use crate::package::PluginPackage;

/// A loaded plugin of the `media-source-fixture` world: the `media-source`
/// export plus the test-only `sandbox-probe` export.
pub struct MediaSourcePlugin {
    store: Store<HostState>,
    bindings: MediaSourceFixture,
    limits: HostLimits,
}

impl MediaSourcePlugin {
    /// Compiles and instantiates the plugin in one step.
    pub fn load(
        package: &PluginPackage,
        grants: CapabilityGrants,
        mode: ExecutionMode,
        limits: HostLimits,
    ) -> Result<Self, PluginError> {
        Self::instantiate(&CompiledPlugin::compile(package, mode)?, grants, limits)
    }

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

    /// Resolves `locator` into `output_dir` and returns the result with the
    /// progress events the plugin reported along the way.
    pub fn resolve(
        &mut self,
        locator: &str,
        output_dir: &str,
    ) -> Result<(ResolvedMedia, Vec<ProgressEvent>), PluginError> {
        reset_fuel(&mut self.store, &self.limits)?;
        let outcome = self
            .bindings
            .easyimmerse_plugin_media_source()
            .call_resolve(&mut self.store, locator, output_dir)?;
        let progress = self.store.data_mut().take_progress();
        let resolved = outcome.map_err(to_error_kind)?;
        Ok((to_resolved_media(resolved), progress))
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
}

fn to_error_kind(error: WitPluginError) -> PluginErrorKind {
    match error {
        WitPluginError::NotPermitted(message) => PluginErrorKind::NotPermitted(message),
        WitPluginError::NotFound(message) => PluginErrorKind::NotFound(message),
        WitPluginError::Io(message) => PluginErrorKind::Io(message),
        WitPluginError::InvalidInput(message) => PluginErrorKind::InvalidInput(message),
        WitPluginError::Other(message) => PluginErrorKind::Other(message),
    }
}

fn to_resolved_media(resolved: WitResolvedMedia) -> ResolvedMedia {
    ResolvedMedia {
        title: resolved.metadata.title,
        media_path: resolved.media_path,
        subtitle_paths: resolved.subtitle_paths,
        duration_ms: resolved.metadata.duration_ms,
    }
}
