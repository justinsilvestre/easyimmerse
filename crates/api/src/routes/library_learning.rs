//! What learners do with library items: adding one to a project, and making flashcards from its words.

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use easyimmerse_core::flashcard::{Flashcard, FlashcardDraft, FlashcardFieldKey};
use easyimmerse_core::library::{
    AddLibraryItem, LibraryItem, LibraryItemAdded, LibraryItemId, NewLibraryFlashcard,
    library_flashcard_content,
};
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource};
use easyimmerse_core::project::{Project, ProjectId, ProjectSettings};
use easyimmerse_storage::{OwnedPath, OwnerId, Storage, StorageError};

use crate::auth::error_body::{ApiError, ApiFailure, bad_request};
use crate::auth::principal::Principal;
use crate::routes::library_support::{load_published_item, load_visible_item};
use crate::routes::media::load_media_file;
use crate::state::AppState;

/// Adds an item to one of the principal's projects, or to a new project named "Library"
/// for the library's language and the item's translation language.
/// A project that already has the item keeps its media file, which is returned.
/// Anyone may add a published item; a library manager may also add an unpublished one,
/// to prepare its words in the player or the reader that learners use.
#[utoipa::path(
    post,
    path = "/library/items/{item_id}/add",
    tag = "library",
    operation_id = "addLibraryItem",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id")),
    request_body = AddLibraryItem,
    responses(
        (status = 200, description = "The project and the item's media file in it", body = LibraryItemAdded),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such item, one the principal may not see, or no such project of the principal's", body = ApiError),
        (status = 409, description = "`library_language_unset`: no project is given and the library has no language yet", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn add_library_item(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path(item_id): Path<LibraryItemId>,
    Json(request): Json<AddLibraryItem>,
) -> Result<Json<LibraryItemAdded>, ApiFailure> {
    let item = load_visible_item(&state, &principal, &item_id).await?;
    let owner = principal.owner_id();
    let added = state
        .with_storage(move |storage| add_to_project(storage, &owner, &item, request.project_id))
        .await?;
    Ok(Json(added))
}

fn add_to_project(
    storage: &Storage,
    owner: &OwnerId,
    item: &LibraryItem,
    project_id: Option<ProjectId>,
) -> Result<LibraryItemAdded, StorageError> {
    let project_id = match project_id {
        Some(project_id) => {
            let path = OwnedPath {
                project_id: Some(project_id.0.clone()),
                ..OwnedPath::default()
            };
            storage.check_owned_path(owner, &path)?;
            project_id
        }
        None => {
            let language = (storage.get_library_settings()?.language)
                .ok_or(StorageError::LibraryLanguageUnset)?;
            let settings = library_project_settings(language, item);
            storage.create_project(owner, &settings)?.id
        }
    };
    let media_file = match storage.find_library_media_file(&project_id, &item.id)? {
        Some(media_file) => media_file,
        None => {
            let source = MediaFileSource::Library {
                item_id: item.id.clone(),
            };
            storage.add_media_file(&project_id, &item.title, &source)?
        }
    };
    Ok(LibraryItemAdded {
        project_id,
        media_file_id: media_file.id,
    })
}

/// The settings of a project made for a library item: the library's language, the item's translation language,
/// the beginner's flashcard fields, and the name "Library".
fn library_project_settings(language: String, item: &LibraryItem) -> ProjectSettings {
    use FlashcardFieldKey::*;
    ProjectSettings {
        name: "Library".to_string(),
        target_language: language,
        translation_language: item.translation_language.clone(),
        flashcard_fields: vec![
            Word,
            WordPronunciation,
            L1Definition,
            TextContext,
            TextContextTranslation,
            TextContextPronunciation,
            AudioContext,
            Screenshot,
            Tags,
        ],
        default_tags: Vec::new(),
        tags_media_name: true,
        fills_audio_with_tts: false,
        flashcard_front_fields: vec![AudioContext, Screenshot],
        lists_anki_deletions: true,
    }
}

/// Saves a flashcard built by the server from a segment of a library media file, and from one of its words when
/// `word_start` names one. The project's default tags, and the media name tag when the project adds it, are its tags.
/// Sending the same id again replaces that flashcard.
#[utoipa::path(
    post,
    path = "/projects/{id}/media/{media_id}/library-flashcards",
    tag = "library",
    operation_id = "createLibraryFlashcard",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    request_body = NewLibraryFlashcard,
    responses(
        (status = 201, description = "The saved flashcard", body = Flashcard),
        (status = 400, description = "The id is not 32 lowercase hexadecimal digits, or no such segment or word", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project, or its item is not published", body = ApiError),
        (status = 409, description = "`not_library_media`: the media file is not from the library; or the id belongs to a flashcard of another project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn create_library_flashcard(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Json(new): Json<NewLibraryFlashcard>,
) -> Result<(StatusCode, Json<Flashcard>), ApiFailure> {
    if !new.id.is_well_formed() {
        return Err(bad_request(format!(
            "the flashcard id {:?} is not 32 lowercase hexadecimal digits",
            new.id.0
        )));
    }
    let media_file = load_media_file(&state, project_id.clone(), media_id).await?;
    let MediaFileSource::Library { item_id } = &media_file.source else {
        return Err(not_library_media());
    };
    let item = load_published_item(&state, item_id).await?;
    let draft = library_flashcard_draft(&state, &item, &media_file, &new).await?;
    let id = new.id;
    let flashcard = state
        .with_storage(move |storage| storage.create_library_flashcard(&project_id, &id, &draft))
        .await?;
    Ok((StatusCode::CREATED, Json(flashcard)))
}

async fn library_flashcard_draft(
    state: &AppState,
    item: &LibraryItem,
    media_file: &MediaFile,
    new: &NewLibraryFlashcard,
) -> Result<FlashcardDraft, ApiFailure> {
    let (item_id, project_id) = (item.id.clone(), media_file.project_id.clone());
    let (text, project) = state
        .with_storage(move |storage| {
            Ok((
                storage.get_library_text(&item_id)?,
                storage.get_project(&project_id)?,
            ))
        })
        .await?;
    let segment = (text.segments.iter())
        .find(|segment| segment.index == new.segment_index)
        .ok_or_else(|| bad_request(format!("the item has no segment {}", new.segment_index)))?;
    let mut content = library_flashcard_content(segment, new.word_start, item.kind)
        .ok_or_else(|| bad_request("no word of the segment begins there"))?;
    content.tags = flashcard_tags(&project, &media_file.name);
    Ok(FlashcardDraft {
        media_file_id: Some(media_file.id.clone()),
        cue_index: Some(new.segment_index),
        word_start: new.word_start,
        content,
        included_fields: project.settings.flashcard_fields,
    })
}

/// The project's default tags, followed by the media name tag when the project adds it and lacks it.
fn flashcard_tags(project: &Project, media_name: &str) -> Vec<String> {
    let mut tags = project.settings.default_tags.clone();
    let name_tag = media_name_tag(media_name);
    if project.settings.tags_media_name && !name_tag.is_empty() && !tags.contains(&name_tag) {
        tags.push(name_tag);
    }
    tags
}

/// Turns a media file's name into a tag as the app does: without its extension, in lower case,
/// with every run of characters other than letters and digits as one hyphen.
fn media_name_tag(name: &str) -> String {
    let stem = match name.rsplit_once('.') {
        Some((stem, extension))
            if !extension.is_empty() && !extension.contains(char::is_whitespace) =>
        {
            stem
        }
        _ => name,
    };
    let lower = stem.to_lowercase();
    let pieces: Vec<&str> = lower
        .split(|character: char| !character.is_alphanumeric())
        .filter(|piece| !piece.is_empty())
        .collect();
    pieces.join("-")
}

fn not_library_media() -> ApiFailure {
    ApiFailure::new(
        StatusCode::CONFLICT,
        "not_library_media",
        "the media file is not from the library",
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn makes_a_tag_of_a_media_name_without_its_extension() {
        assert_eq!(media_name_tag("Der Film (2001).mp4"), "der-film-2001");
    }

    #[test]
    fn keeps_a_media_name_without_an_extension_whole() {
        assert_eq!(media_name_tag("Kurzfilm"), "kurzfilm");
    }
}
