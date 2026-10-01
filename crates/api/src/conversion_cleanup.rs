//! Removing cached conversions when the media files they were made for are removed.

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use easyimmerse_core::media_file::{MediaFile, MediaId, MediaSource};
use easyimmerse_core::project::ProjectId;
use easyimmerse_storage::{Storage, StorageError};

use crate::state::AppState;

/// Removes a media file and returns its local path, unless another media file is read from that path.
pub fn remove_media_file_and_find_unused_sources(
    storage: &Storage,
    project_id: &ProjectId,
    media_id: &MediaId,
) -> Result<Vec<String>, StorageError> {
    let media = storage.get_media_file(project_id, media_id)?;
    storage.remove_media_file(project_id, media_id)?;
    unused_sources(storage, &[media])
}

/// Deletes a project and returns the local paths of its media files that no other media file is read from.
pub fn delete_project_and_find_unused_sources(
    storage: &Storage,
    project_id: &ProjectId,
) -> Result<Vec<String>, StorageError> {
    let media = storage.get_project(project_id)?.media;
    storage.delete_project(project_id)?;
    unused_sources(storage, &media)
}

/// Removes the cached conversions of each source.
/// Failures are logged rather than returned, since the media files are already removed and the next startup cleans up the cache again.
pub async fn remove_conversions_of_sources(state: &AppState, sources: Vec<String>) {
    let Some(service) = &state.conversions else {
        return;
    };
    for source in sources {
        if let Err(error) = service.remove_source(Path::new(&source)).await {
            tracing::warn!("could not remove the cached conversions of {source}: {error}");
        }
    }
}

/// Removes unfinished conversions and the conversions of sources that no media file is read from any more, then trims the cache to its limit.
pub async fn clean_up_conversion_cache(state: AppState) {
    let Some(service) = state.conversions.clone() else {
        return;
    };
    let paths = state.with_storage(|storage| storage.list_local_media_paths());
    let known_sources: HashSet<PathBuf> = match paths.await {
        Ok(paths) => paths.into_iter().map(PathBuf::from).collect(),
        Err(failure) => {
            tracing::warn!(
                "could not list media files to clean up the conversion cache: {}",
                failure.error.message
            );
            return;
        }
    };
    if let Err(error) = service.clean_up(known_sources).await {
        tracing::warn!("could not clean up the conversion cache: {error}");
    }
}

fn unused_sources(storage: &Storage, media: &[MediaFile]) -> Result<Vec<String>, StorageError> {
    let used: HashSet<String> = storage.list_local_media_paths()?.into_iter().collect();
    let sources = media.iter().filter_map(|media| match &media.source {
        MediaSource::Path { path } if !used.contains(path) => Some(path.clone()),
        _ => None,
    });
    Ok(sources.collect::<HashSet<_>>().into_iter().collect())
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::flashcard::{FlashcardPreset, FlashcardSettings};
    use easyimmerse_core::media_file::{MediaKind, NewMediaFile};
    use easyimmerse_core::project::ProjectSettings;

    use super::*;

    const NOW: &str = "2026-10-01T00:00:00Z";

    fn video(source: MediaSource) -> NewMediaFile {
        NewMediaFile {
            name: "episode.mkv".to_owned(),
            kind: MediaKind::Video,
            source,
        }
    }

    fn local(path: &str) -> MediaSource {
        MediaSource::Path {
            path: path.to_owned(),
        }
    }

    fn project(storage: &Storage) -> ProjectId {
        let settings = ProjectSettings {
            name: "Krimi".to_owned(),
            target_language: "de".to_owned(),
            translation_language: "en".to_owned(),
            flashcard_settings: FlashcardSettings::for_preset(FlashcardPreset::Beginner),
        };
        storage
            .create_project(&settings, NOW)
            .expect("create project")
            .id
    }

    fn add(storage: &Storage, project_id: &ProjectId, source: MediaSource) -> MediaId {
        let media = storage.add_media_file(project_id, &video(source), NOW);
        media.expect("add media").id
    }

    #[test]
    fn finds_the_source_of_the_only_media_file_read_from_it() {
        let storage = Storage::open_in_memory().expect("storage");
        let project_id = project(&storage);
        let media_id = add(&storage, &project_id, local("/media/a.mkv"));
        let sources = remove_media_file_and_find_unused_sources(&storage, &project_id, &media_id);
        assert_eq!(sources.ok(), Some(vec!["/media/a.mkv".to_owned()]));
    }

    #[test]
    fn keeps_a_source_that_another_project_reads() {
        let storage = Storage::open_in_memory().expect("storage");
        let (first, second) = (project(&storage), project(&storage));
        let media_id = add(&storage, &first, local("/media/a.mkv"));
        add(&storage, &second, local("/media/a.mkv"));
        let sources = remove_media_file_and_find_unused_sources(&storage, &first, &media_id);
        assert_eq!(sources.ok(), Some(Vec::new()));
    }

    #[test]
    fn finds_no_source_for_a_browser_file() {
        let storage = Storage::open_in_memory().expect("storage");
        let project_id = project(&storage);
        let key = MediaSource::BrowserFile {
            key: "a".to_owned(),
        };
        let media_id = add(&storage, &project_id, key);
        let sources = remove_media_file_and_find_unused_sources(&storage, &project_id, &media_id);
        assert_eq!(sources.ok(), Some(Vec::new()));
    }

    #[test]
    fn finds_the_sources_of_a_deleted_project() {
        let storage = Storage::open_in_memory().expect("storage");
        let project_id = project(&storage);
        add(&storage, &project_id, local("/media/a.mkv"));
        let sources = delete_project_and_find_unused_sources(&storage, &project_id);
        assert_eq!(sources.ok(), Some(vec!["/media/a.mkv".to_owned()]));
    }
}
