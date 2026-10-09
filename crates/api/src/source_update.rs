//! Applying the changes a media-source plugin asks for to a media file imported through
//! it: fetching more subtitle tracks, then removing held ones.

use std::path::{Path, PathBuf};

use easyimmerse_core::media_file::{MediaFile, MediaFileSource};
use easyimmerse_core::project::ProjectSettings;
use easyimmerse_core::providers::media_source::{ResolvedSubtitle, SkippedSubtitle};
use easyimmerse_core::subtitle_track::SubtitleTrackId;
use easyimmerse_plugins::{FetchRequest, MediaContext, MediaUpdate, PluginPackage};

use crate::auth::error_body::{ApiFailure, internal};
use crate::fetched_subtitle_files::{SUBTITLES_DIR_PREFIX, remove_subtitle_tracks};
use crate::fetched_subtitles::{FetchedTracks, read_fetched_subtitles, store_fetched_tracks};
use crate::plugins::{fetch_subtitles, fetched_item_dir};
use crate::routes::plugins::{canonicalize_inside, discard_output_dir, media_dir, run_plugin_call};
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

/// The subtitle files a plugin fetched, the directory it fetched them into, and the ids of
/// the tracks it said it would fetch.
#[derive(Default)]
struct FetchedFiles {
    dir: Option<PathBuf>,
    requested: Vec<String>,
    subtitles: Vec<ResolvedSubtitle>,
}

/// Removes the tracks among `ids` that the media file holds, ignoring any other id,
/// deletes their files when the plugin fetched them,
/// and returns the ids of the removed tracks.
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
    remove_subtitle_tracks(state, &source.media_file, &held).await?;
    Ok(held)
}

/// Fetches the tracks the plugin asks for into a fresh directory beside the media file,
/// removing the directory again when the fetch fails.
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
    let subtitles = match fetch_into(source, request, &output_dir).await {
        Ok(subtitles) => subtitles,
        Err(failure) => {
            discard_output_dir(&output_dir).await;
            return Err(failure);
        }
    };
    Ok(FetchedFiles {
        dir: Some(output_dir),
        requested,
        subtitles,
    })
}

async fn fetch_into(
    source: &SourceMedia,
    request: FetchRequest,
    output_dir: &Path,
) -> Result<Vec<ResolvedSubtitle>, ApiFailure> {
    let (package, dir) = (source.package.clone(), output_dir.to_path_buf());
    let mut subtitles = run_plugin_call(move || fetch_subtitles(&package, &request, &dir)).await?;
    canonicalize_inside(
        output_dir,
        subtitles.iter_mut().map(|subtitle| &mut subtitle.path),
    )?;
    Ok(subtitles)
}

/// Adds the fetched tracks, giving them the roles left free, and returns the tracks asked
/// for that were not added. When none was added, the fetch's directory is removed.
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
    if let Some(dir) = fetched.dir.filter(|_| tracks.is_empty()) {
        discard_output_dir(&dir).await;
    }
    state
        .with_storage(move |storage| {
            store_fetched_tracks(storage, &media_id, tracks, taken)?;
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
        "{SUBTITLES_DIR_PREFIX}{}",
        hex::encode(rand::random::<[u8; 8]>())
    )))
}
