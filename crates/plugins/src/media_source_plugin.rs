use easyimmerse_core::providers::media_source::{ProgressEvent, ResolvedMedia, ResolvedSubtitle};
use easyimmerse_plugin_api::base::easyimmerse::plugin::types::{
    PluginError as WitPluginError, ResolvedMedia as WitResolvedMedia,
};
use easyimmerse_plugin_api::media_source::MediaSourcePlugin as MediaSourceBindings;
use wasmtime::Store;

use crate::compiled_plugin::CompiledPlugin;
use crate::error::{PluginError, PluginErrorKind};
use crate::execution_mode::ExecutionMode;
use crate::grants::CapabilityGrants;
use crate::host_state::{HostState, LogEntry};
use crate::limits::{HostLimits, reset_fuel};
use crate::package::PluginPackage;

/// A loaded plugin of the `media-source-plugin` world, which resolves a locator such as
/// a URL into media and subtitle files inside a directory the host has granted.
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

/// The plugin interface lists the subtitle files and their descriptions side by side,
/// in the same order; a description without a file, or the reverse, is dropped.
fn to_resolved_media(resolved: WitResolvedMedia) -> ResolvedMedia {
    let subtitles = resolved
        .subtitle_paths
        .into_iter()
        .zip(resolved.subtitle_tracks)
        .map(|(path, track)| ResolvedSubtitle {
            path,
            language: track.language,
        })
        .collect();
    ResolvedMedia {
        title: resolved.metadata.title,
        media_path: resolved.media_path,
        subtitles,
        duration_ms: resolved.metadata.duration_ms,
    }
}

#[cfg(test)]
mod tests {
    use easyimmerse_plugin_api::base::easyimmerse::plugin::types::{
        MediaMetadata, SubtitleTrack as WitSubtitleTrack,
    };

    use super::*;

    fn wit_media(tracks: Vec<WitSubtitleTrack>, paths: Vec<&str>) -> WitResolvedMedia {
        WitResolvedMedia {
            metadata: MediaMetadata {
                title: "t".to_string(),
                duration_ms: Some(1),
                media_url: "u".to_string(),
            },
            subtitle_tracks: tracks,
            media_path: "/out/media.mp4".to_string(),
            subtitle_paths: paths.into_iter().map(str::to_string).collect(),
        }
    }

    fn track(language: Option<&str>) -> WitSubtitleTrack {
        WitSubtitleTrack {
            language: language.map(str::to_string),
            url: "u".to_string(),
        }
    }

    #[test]
    fn pairs_each_subtitle_path_with_its_language() {
        let resolved = to_resolved_media(wit_media(
            vec![track(Some("ja")), track(None)],
            vec!["/out/a.vtt", "/out/b.vtt"],
        ));
        assert_eq!(
            resolved.subtitles,
            vec![
                ResolvedSubtitle {
                    path: "/out/a.vtt".to_string(),
                    language: Some("ja".to_string()),
                },
                ResolvedSubtitle {
                    path: "/out/b.vtt".to_string(),
                    language: None,
                },
            ]
        );
    }

    #[test]
    fn drops_a_subtitle_description_without_a_file() {
        let resolved = to_resolved_media(wit_media(
            vec![track(Some("ja")), track(Some("en"))],
            vec!["/out/a.vtt"],
        ));
        assert_eq!(resolved.subtitles.len(), 1);
    }
}
