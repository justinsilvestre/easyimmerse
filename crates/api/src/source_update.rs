//! Applying the changes a media-source plugin asks for to a media file imported through
//! it: fetching more subtitle tracks, then removing held ones.

use std::path::PathBuf;

use easyimmerse_core::media_file::{MediaFile, MediaFileSource};
use easyimmerse_core::project::ProjectSettings;
use easyimmerse_core::providers::media_source::{ResolvedSubtitle, SkippedSubtitle};
use easyimmerse_core::subtitle_track::SubtitleTrackId;
use easyimmerse_plugins::{FetchRequest, MediaContext, MediaUpdate, PluginPackage};

use crate::auth::error_body::{ApiFailure, internal};
use crate::fetched_subtitles::{FetchedTracks, read_fetched_subtitles};
use crate::plugins::{fetch_subtitles, fetched_item_dir};
use crate::routes::plugins::{ensure_inside, media_dir, run_plugin_call};
use crate::routes::source_form::SourceStepResponse;
use crate::state::AppState;

/// A media file imported through a plugin, with the plugin and what to tell it.
pub(crate) struct SourceMedia {
    pub settings: ProjectSettings,
    pub media_file: MediaFile,
    pub package: PluginPackage,
    pub context: MediaContext,
}

/// Fetches the tracks the update asks for, then removes the held tracks it names and adds
/// the fetched ones, and answers with the media file's tracks afterwards. A failed fetch
/// changes nothing.
pub(crate) async fn apply_media_update(
    state: &AppState,
    source: SourceMedia,
    update: MediaUpdate,
) -> Result<SourceStepResponse, ApiFailure> {
    let fetched = match update.fetch {
        Some(request) => fetch_tracks(state, &source, request).await?,
        None => FetchedFiles::default(),
    };
    let removed = remove_held_tracks(state, &source, update.remove_subtitles).await?;
    let skipped = add_fetched_tracks(state, &source, fetched).await?;
    let media_id = source.media_file.id;
    state
        .with_storage(move |storage| {
            Ok(SourceStepResponse::Applied {
                removed,
                tracks: storage.list_subtitle_tracks(&media_id)?,
                selection: storage.get_subtitle_selection(&media_id)?,
                skipped,
            })
        })
        .await
}

/// The subtitle files a plugin fetched, with the ids of the tracks it said it would fetch.
#[derive(Default)]
struct FetchedFiles {
    requested: Vec<String>,
    subtitles: Vec<ResolvedSubtitle>,
}

/// Removes the tracks among `ids` that the media file holds, ignoring any other id, and
/// returns the ids of the removed tracks.
async fn remove_held_tracks(
    state: &AppState,
    source: &SourceMedia,
    ids: Vec<String>,
) -> Result<Vec<SubtitleTrackId>, ApiFailure> {
    let held: Vec<SubtitleTrackId> = ids
        .into_iter()
        .filter(|id| source.context.subtitles.iter().any(|held| &held.id == id))
        .map(SubtitleTrackId)
        .collect();
    state
        .with_storage(move |storage| {
            for id in &held {
                storage.remove_subtitle_track(id)?;
            }
            Ok(held)
        })
        .await
}

/// Fetches the tracks the plugin asks for into a fresh directory beside the media file.
async fn fetch_tracks(
    state: &AppState,
    source: &SourceMedia,
    request: FetchRequest,
) -> Result<FetchedFiles, ApiFailure> {
    let output_dir = subtitles_dir(state, &source.media_file)?;
    tokio::fs::create_dir_all(&output_dir)
        .await
        .map_err(|error| {
            internal(format!(
                "could not create {}: {error}",
                output_dir.display()
            ))
        })?;
    let requested = request.subtitles.clone();
    let (package, dir) = (source.package.clone(), output_dir.clone());
    let subtitles = run_plugin_call(move || fetch_subtitles(&package, &request, &dir)).await?;
    ensure_inside(
        &output_dir,
        subtitles.iter().map(|subtitle| subtitle.path.as_str()),
    )?;
    Ok(FetchedFiles {
        requested,
        subtitles,
    })
}

/// Adds the fetched tracks, giving them the roles left free, and returns the tracks asked
/// for that were not added.
async fn add_fetched_tracks(
    state: &AppState,
    source: &SourceMedia,
    fetched: FetchedFiles,
) -> Result<Vec<SkippedSubtitle>, ApiFailure> {
    let media_id = source.media_file.id.clone();
    let taken = {
        let media_id = media_id.clone();
        state
            .with_storage(move |storage| storage.get_subtitle_selection(&media_id))
            .await?
    };
    let FetchedTracks { tracks, skipped } = read_fetched_subtitles(
        &fetched.requested,
        &fetched.subtitles,
        &source.settings,
        taken.clone(),
    )
    .await;
    state
        .with_storage(move |storage| {
            let mut selection = taken;
            for (track, role) in tracks {
                let added = storage.add_subtitle_track(&media_id, &track)?;
                if let Some(role) = role {
                    selection = selection.with_role(role, added.id);
                }
            }
            storage.set_subtitle_selection(&media_id, &selection)?;
            Ok(skipped)
        })
        .await
}

/// A fresh directory for the fetched subtitles inside the directory the media file was
/// fetched into, so that they are removed with it and never overwrite an earlier fetch.
fn subtitles_dir(state: &AppState, media_file: &MediaFile) -> Result<PathBuf, ApiFailure> {
    let media_dir = media_dir(state)?;
    let MediaFileSource::Path { path } = &media_file.source else {
        return Err(internal("the fetched media file has no path"));
    };
    let item_dir = fetched_item_dir(&media_dir, path)
        .ok_or_else(|| internal(format!("{path} is not inside the media directory")))?;
    Ok(item_dir.join(format!(
        "subtitles-{}",
        hex::encode(rand::random::<[u8; 8]>())
    )))
}
