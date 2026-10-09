//! What the host and a media-source plugin tell each other through the plugin's import
//! and media interfaces, with the conversions to and from the WIT types.

use easyimmerse_core::providers::media_source::{ResolvedMedia, ResolvedSubtitle};
use easyimmerse_core::providers::plugin_form::{FormInput, PluginForm};
use easyimmerse_plugin_api::base::easyimmerse::plugin::types::{
    FetchRequest as WitFetchRequest, FetchedSubtitle as WitFetchedSubtitle,
    HeldSubtitle as WitHeldSubtitle, ImportAnswer as WitImportAnswer,
    ImportContext as WitImportContext, ImportRequest as WitImportRequest,
    MediaAnswer as WitMediaAnswer, MediaContext as WitMediaContext,
    ResolvedMedia as WitResolvedMedia,
};

use crate::plugin_form::{to_form, to_inputs, to_wit_inputs};

/// What the host tells a plugin about the project an import is for.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ImportContext {
    /// The project's languages as BCP 47 tags, target language first.
    pub languages: Vec<String>,
}

/// An import the plugin is ready to run.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ImportRequest {
    /// Identifies the media at the source; the host keeps it as the media file's origin.
    pub locator: String,
    /// The input of the form the import was submitted from.
    pub input: Vec<FormInput>,
    /// The ids of the subtitle tracks the plugin will try to fetch.
    pub subtitles: Vec<String>,
}

/// The plugin's answer to an action in its import interface.
#[derive(Debug, Clone, PartialEq)]
pub enum ImportAnswer {
    Form(PluginForm),
    Import(ImportRequest),
}

/// A subtitle track the host holds for a media file.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HeldSubtitle {
    pub id: String,
    pub name: String,
}

/// What the host tells a plugin about a media file imported through it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MediaContext {
    pub locator: String,
    /// The project's languages as BCP 47 tags, target language first.
    pub languages: Vec<String>,
    pub subtitles: Vec<HeldSubtitle>,
}

/// Subtitle tracks the plugin is ready to fetch for media imported earlier.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FetchRequest {
    pub locator: String,
    /// The input of the form the fetch was submitted from.
    pub input: Vec<FormInput>,
    /// The ids of the subtitle tracks the plugin will try to fetch.
    pub subtitles: Vec<String>,
}

/// Changes to a media file the host applies at the plugin's request.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MediaUpdate {
    /// Ids of held subtitle tracks to remove.
    pub remove_subtitles: Vec<String>,
    pub fetch: Option<FetchRequest>,
}

/// The plugin's answer to an action in its media interface.
#[derive(Debug, Clone, PartialEq)]
pub enum MediaAnswer {
    Form(PluginForm),
    Apply(MediaUpdate),
}

pub(crate) fn to_wit_import_context(context: &ImportContext) -> WitImportContext {
    WitImportContext {
        languages: context.languages.clone(),
    }
}

pub(crate) fn to_wit_import_request(request: &ImportRequest) -> WitImportRequest {
    WitImportRequest {
        locator: request.locator.clone(),
        input: to_wit_inputs(&request.input),
        subtitles: request.subtitles.clone(),
    }
}

pub(crate) fn to_import_answer(answer: WitImportAnswer) -> ImportAnswer {
    match answer {
        WitImportAnswer::Form(form) => ImportAnswer::Form(to_form(form)),
        WitImportAnswer::Import(request) => ImportAnswer::Import(ImportRequest {
            locator: request.locator,
            input: to_inputs(request.input),
            subtitles: request.subtitles,
        }),
    }
}

pub(crate) fn to_wit_media_context(context: &MediaContext) -> WitMediaContext {
    let subtitles = context.subtitles.iter().map(to_wit_held_subtitle);
    WitMediaContext {
        locator: context.locator.clone(),
        languages: context.languages.clone(),
        subtitles: subtitles.collect(),
    }
}

fn to_wit_held_subtitle(subtitle: &HeldSubtitle) -> WitHeldSubtitle {
    WitHeldSubtitle {
        id: subtitle.id.clone(),
        name: subtitle.name.clone(),
    }
}

pub(crate) fn to_media_answer(answer: WitMediaAnswer) -> MediaAnswer {
    match answer {
        WitMediaAnswer::Form(form) => MediaAnswer::Form(to_form(form)),
        WitMediaAnswer::Apply(update) => MediaAnswer::Apply(MediaUpdate {
            remove_subtitles: update.remove_subtitles,
            fetch: update.fetch.map(to_fetch_request),
        }),
    }
}

fn to_fetch_request(request: WitFetchRequest) -> FetchRequest {
    FetchRequest {
        locator: request.locator,
        input: to_inputs(request.input),
        subtitles: request.subtitles,
    }
}

pub(crate) fn to_wit_fetch_request(request: &FetchRequest) -> WitFetchRequest {
    WitFetchRequest {
        locator: request.locator.clone(),
        input: to_wit_inputs(&request.input),
        subtitles: request.subtitles.clone(),
    }
}

pub(crate) fn to_resolved_media(resolved: WitResolvedMedia) -> ResolvedMedia {
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

pub(crate) fn to_resolved_subtitle(subtitle: WitFetchedSubtitle) -> ResolvedSubtitle {
    ResolvedSubtitle {
        id: subtitle.id,
        path: subtitle.path,
        language: subtitle.language,
        name: subtitle.name,
    }
}
