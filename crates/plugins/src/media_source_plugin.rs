use easyimmerse_core::providers::media_source::{ProgressEvent, ResolvedMedia, ResolvedSubtitle};
use easyimmerse_core::providers::plugin_form::{FormInput, PluginForm};
use easyimmerse_plugin_api::base::easyimmerse::plugin::types::PluginError as WitPluginError;
use easyimmerse_plugin_api::media_source::MediaSourcePlugin as MediaSourceBindings;
use easyimmerse_plugin_api::media_source::exports::easyimmerse::plugin::media_source::Guest as MediaSourceExports;
use wasmtime::Store;

use crate::compiled_plugin::CompiledPlugin;
use crate::error::{PluginError, PluginErrorKind};
use crate::grants::CapabilityGrants;
use crate::host_state::{HostEvent, HostState, LogEntry};
use crate::limits::{HostLimits, reset_fuel};
use crate::media_source_exchange::{
    FetchRequest, ImportAnswer, ImportContext, ImportRequest, MediaAnswer, MediaContext,
    to_import_answer, to_media_answer, to_resolved_media, to_resolved_subtitle,
    to_wit_fetch_request, to_wit_import_context, to_wit_import_request, to_wit_media_context,
};
use crate::plugin_form::{to_form, to_wit_inputs};

/// A loaded plugin of the `media-source-plugin` world, which shows forms through which the
/// user imports media and subtitles from a source, and fetches those files into a directory
/// the host has granted.
pub struct MediaSourcePlugin {
    store: Store<HostState>,
    bindings: MediaSourceBindings,
    limits: HostLimits,
}

impl MediaSourcePlugin {
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

    /// The first form of the plugin's import interface.
    pub fn import_form(&mut self, context: &ImportContext) -> Result<PluginForm, PluginError> {
        let context = to_wit_import_context(context);
        let form = self.call(|exports, store| exports.call_import_form(store, &context))?;
        Ok(to_form(form))
    }

    /// Answers an action in the import interface with the next form or the import to run.
    pub fn import_step(
        &mut self,
        context: &ImportContext,
        action: &str,
        input: &[FormInput],
    ) -> Result<ImportAnswer, PluginError> {
        let (context, input) = (to_wit_import_context(context), to_wit_inputs(input));
        let answer =
            self.call(|exports, store| exports.call_import_step(store, &context, action, &input))?;
        Ok(to_import_answer(answer))
    }

    /// Fetches the media and subtitles the request asks for into `output_dir`, and returns
    /// the result with the progress events the plugin reported along the way.
    pub fn import(
        &mut self,
        request: &ImportRequest,
        output_dir: &str,
    ) -> Result<(ResolvedMedia, Vec<ProgressEvent>), PluginError> {
        let request = to_wit_import_request(request);
        let outcome = self.call(|exports, store| exports.call_import(store, &request, output_dir));
        let progress = self.store.data_mut().take_progress();
        Ok((to_resolved_media(outcome?), progress))
    }

    /// The first form of the plugin's media interface for media imported earlier.
    pub fn media_form(&mut self, context: &MediaContext) -> Result<PluginForm, PluginError> {
        let context = to_wit_media_context(context);
        let form = self.call(|exports, store| exports.call_media_form(store, &context))?;
        Ok(to_form(form))
    }

    /// Answers an action in the media interface with the next form or the update to apply.
    pub fn media_step(
        &mut self,
        context: &MediaContext,
        action: &str,
        input: &[FormInput],
    ) -> Result<MediaAnswer, PluginError> {
        let (context, input) = (to_wit_media_context(context), to_wit_inputs(input));
        let answer =
            self.call(|exports, store| exports.call_media_step(store, &context, action, &input))?;
        Ok(to_media_answer(answer))
    }

    /// Fetches the subtitle tracks the request asks for into `output_dir`.
    pub fn fetch_subtitles(
        &mut self,
        request: &FetchRequest,
        output_dir: &str,
    ) -> Result<Vec<ResolvedSubtitle>, PluginError> {
        let request = to_wit_fetch_request(request);
        let fetched =
            self.call(|exports, store| exports.call_fetch_subtitles(store, &request, output_dir))?;
        Ok(fetched.into_iter().map(to_resolved_subtitle).collect())
    }

    /// Installs the listener that hears each log entry, progress report, and command of
    /// the plugin's calls as it happens, replacing any earlier one. The entries and
    /// reports are still collected for `take_log` and `import`.
    pub fn listen(&mut self, listener: impl FnMut(HostEvent) + Send + 'static) {
        self.store.data_mut().listener = Some(Box::new(listener));
    }

    /// Removes and returns the log entries the plugin has written so far.
    pub fn take_log(&mut self) -> Vec<LogEntry> {
        self.store.data_mut().take_log()
    }

    /// Calls one export with a fresh fuel budget, turning the plugin's own error into a
    /// `PluginError`.
    fn call<T>(
        &mut self,
        export: impl FnOnce(
            &MediaSourceExports,
            &mut Store<HostState>,
        ) -> wasmtime::Result<Result<T, WitPluginError>>,
    ) -> Result<T, PluginError> {
        reset_fuel(&mut self.store, &self.limits)?;
        let exports = self.bindings.easyimmerse_plugin_media_source();
        let outcome = export(exports, &mut self.store)?;
        Ok(outcome.map_err(to_error_kind)?)
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
