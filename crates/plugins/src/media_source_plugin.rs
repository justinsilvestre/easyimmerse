use easyimmerse_core::providers::media_source::{
    AvailableSubtitle, MediaDescription, ProgressEvent, ResolvedMedia, ResolvedSubtitle,
};
use easyimmerse_plugin_api::base::easyimmerse::plugin::types::{
    AvailableSubtitle as WitAvailableSubtitle, FetchedSubtitle as WitFetchedSubtitle,
    MediaDescription as WitMediaDescription, PluginError as WitPluginError,
    ResolvedMedia as WitResolvedMedia,
};
use easyimmerse_plugin_api::media_source::MediaSourcePlugin as MediaSourceBindings;
use wasmtime::Store;

use crate::compiled_plugin::CompiledPlugin;
use crate::error::{PluginError, PluginErrorKind};
use crate::execution_mode::ExecutionMode;
use crate::grants::CapabilityGrants;
use crate::host_state::{HostEvent, HostState, LogEntry};
use crate::limits::{HostLimits, reset_fuel};
use crate::package::PluginPackage;

/// A loaded plugin of the `media-source-plugin` world, which describes a locator such as
/// a URL and fetches its media and subtitle files into a directory the host has granted.
pub struct MediaSourcePlugin {
    store: Store<HostState>,
    bindings: MediaSourceBindings,
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
            MediaSourceBindings::instantiate(&mut store, &compiled.component, &compiled.linker)?;
        Ok(Self {
            store,
            bindings,
            limits,
        })
    }

    /// Asks what the source has for `locator`, without fetching anything.
    pub fn describe(&mut self, locator: &str) -> Result<MediaDescription, PluginError> {
        reset_fuel(&mut self.store, &self.limits)?;
        let outcome = self
            .bindings
            .easyimmerse_plugin_media_source()
            .call_describe(&mut self.store, locator)?;
        Ok(to_description(outcome.map_err(to_error_kind)?))
    }

    /// Fetches the media at `locator` and the subtitle tracks with the given ids into
    /// `output_dir`, and returns the result with the progress events the plugin reported
    /// along the way.
    pub fn resolve(
        &mut self,
        locator: &str,
        output_dir: &str,
        subtitle_ids: &[String],
    ) -> Result<(ResolvedMedia, Vec<ProgressEvent>), PluginError> {
        reset_fuel(&mut self.store, &self.limits)?;
        let outcome = self
            .bindings
            .easyimmerse_plugin_media_source()
            .call_resolve(&mut self.store, locator, output_dir, subtitle_ids)?;
        let progress = self.store.data_mut().take_progress();
        let resolved = outcome.map_err(to_error_kind)?;
        Ok((to_resolved_media(resolved), progress))
    }

    /// Fetches only the subtitle tracks with the given ids into `output_dir`.
    pub fn fetch_subtitles(
        &mut self,
        locator: &str,
        output_dir: &str,
        subtitle_ids: &[String],
    ) -> Result<Vec<ResolvedSubtitle>, PluginError> {
        reset_fuel(&mut self.store, &self.limits)?;
        let outcome = self
            .bindings
            .easyimmerse_plugin_media_source()
            .call_fetch_subtitles(&mut self.store, locator, output_dir, subtitle_ids)?;
        let fetched = outcome.map_err(to_error_kind)?;
        Ok(fetched.into_iter().map(to_resolved_subtitle).collect())
    }

    /// Installs the listener that hears each log entry, progress report, and command of
    /// the plugin's calls as it happens, replacing any earlier one. The entries and
    /// reports are still collected for `take_log` and `resolve`.
    pub fn listen(&mut self, listener: impl FnMut(HostEvent) + Send + 'static) {
        self.store.data_mut().listener = Some(Box::new(listener));
    }

    /// Removes and returns the log entries the plugin has written so far.
    pub fn take_log(&mut self) -> Vec<LogEntry> {
        self.store.data_mut().take_log()
    }
}

pub(crate) fn to_error_kind(error: WitPluginError) -> PluginErrorKind {
    match error {
        WitPluginError::NotPermitted(message) => PluginErrorKind::NotPermitted(message),
        WitPluginError::NotFound(message) => PluginErrorKind::NotFound(message),
        WitPluginError::Io(message) => PluginErrorKind::Io(message),
        WitPluginError::InvalidInput(message) => PluginErrorKind::InvalidInput(message),
        WitPluginError::Other(message) => PluginErrorKind::Other(message),
    }
}

fn to_description(description: WitMediaDescription) -> MediaDescription {
    MediaDescription {
        title: description.metadata.title,
        duration_ms: description.metadata.duration_ms,
        subtitles: description
            .subtitles
            .into_iter()
            .map(to_available_subtitle)
            .collect(),
    }
}

fn to_available_subtitle(subtitle: WitAvailableSubtitle) -> AvailableSubtitle {
    AvailableSubtitle {
        id: subtitle.id,
        language: subtitle.language,
        name: subtitle.name,
    }
}

fn to_resolved_media(resolved: WitResolvedMedia) -> ResolvedMedia {
    ResolvedMedia {
        title: resolved.metadata.title,
        media_path: resolved.media_path,
        subtitles: resolved
            .subtitles
            .into_iter()
            .map(to_resolved_subtitle)
            .collect(),
        duration_ms: resolved.metadata.duration_ms,
    }
}

fn to_resolved_subtitle(subtitle: WitFetchedSubtitle) -> ResolvedSubtitle {
    ResolvedSubtitle {
        id: subtitle.id,
        path: subtitle.path,
        language: subtitle.language,
        name: subtitle.name,
    }
}
