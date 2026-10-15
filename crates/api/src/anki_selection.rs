//! The project and flashcards that an Anki export or an AnkiConnect send works from.

use std::collections::HashMap;

use easyimmerse_anki::DeckSpec;
use easyimmerse_core::flashcard::{Flashcard, FlashcardId};
use easyimmerse_core::project::{Project, ProjectId};

use crate::auth::error_body::{ApiFailure, bad_request};
use crate::now_ms::now_ms;
use crate::state::AppState;

/// A project and the named flashcards of it, as they stood at `read_at_ms`.
pub struct Selection {
    pub project: Project,
    pub flashcards: Vec<Flashcard>,
    /// Milliseconds since the Unix epoch, taken just before the flashcards were read.
    /// An edit saved later has a later `updated_at_ms`, so a record stamped with this time still counts it as changed.
    pub read_at_ms: u64,
}

/// Loads the project and the named flashcards of it, in the order named and each once.
/// A named flashcard that is not in the project is passed over.
pub async fn load_selection(
    state: &AppState,
    project_id: ProjectId,
    ids: Vec<FlashcardId>,
) -> Result<Selection, ApiFailure> {
    if ids.is_empty() {
        return Err(bad_request("name at least one flashcard"));
    }
    let selection = load_project_flashcards(state, project_id).await?;
    Ok(Selection {
        flashcards: select_flashcards(selection.flashcards, &ids),
        ..selection
    })
}

async fn load_project_flashcards(
    state: &AppState,
    project_id: ProjectId,
) -> Result<Selection, ApiFailure> {
    state
        .with_storage(move |storage| {
            let read_at_ms = now_ms();
            Ok(Selection {
                project: storage.get_project(&project_id)?,
                flashcards: storage.list_flashcards(&project_id)?,
                read_at_ms,
            })
        })
        .await
}

/// Picks the named flashcards out of a project's flashcards, in the order named and each once.
fn select_flashcards(flashcards: Vec<Flashcard>, ids: &[FlashcardId]) -> Vec<Flashcard> {
    let mut by_id: HashMap<FlashcardId, Flashcard> = flashcards
        .into_iter()
        .map(|flashcard| (flashcard.id.clone(), flashcard))
        .collect();
    ids.iter().filter_map(|id| by_id.remove(id)).collect()
}

/// What a project contributes to its Anki deck and note type.
pub fn deck_spec(project: &Project) -> DeckSpec<'_> {
    DeckSpec {
        project_id: &project.id.0,
        project_name: &project.settings.name,
        project_created_at_ms: project.created_at_ms,
        front_fields: &project.settings.flashcard_front_fields,
    }
}
