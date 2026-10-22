use axum::extract::rejection::RawPathParamsRejection;
use axum::extract::{MatchedPath, RawPathParams, Request, State};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use easyimmerse_storage::OwnedPath;

use crate::auth::error_body::unauthorized;
use crate::auth::principal::Principal;
use crate::state::AppState;

/// Answers 404, as for a missing row, when an id in the matched path names a row of another owner than the principal's.
/// It runs after `require_bearer_token`, which records the principal, so that the handlers need no check of their own.
pub async fn require_owned_path(
    State(state): State<AppState>,
    matched: Option<MatchedPath>,
    params: Result<RawPathParams, RawPathParamsRejection>,
    request: Request,
    next: Next,
) -> Response {
    let Some(owner) = request
        .extensions()
        .get::<Principal>()
        .map(Principal::owner_id)
    else {
        return unauthorized().into_response();
    };
    let (Some(matched), Ok(params)) = (matched, params) else {
        return next.run(request).await;
    };
    let path = owned_path_of(matched.as_str(), params.iter());
    if path == OwnedPath::default() {
        return next.run(request).await;
    }
    let checked = state
        .with_storage(move |storage| storage.check_owned_path(&owner, &path))
        .await;
    match checked {
        Ok(()) => next.run(request).await,
        Err(failure) => failure.into_response(),
    }
}

/// The ids that the parameters of a matched path name.
/// `id` names a project under `/projects/{id}` and a dictionary under `/dictionaries/{id}`, and nothing elsewhere.
/// The flashcard id of a pending Anki deletion names a flashcard already deleted, so it is left out.
fn owned_path_of<'a>(
    matched: &str,
    params: impl IntoIterator<Item = (&'a str, &'a str)>,
) -> OwnedPath {
    let mut path = OwnedPath::default();
    for (name, value) in params {
        let value = Some(value.to_string());
        match name {
            "id" if matched.starts_with("/projects/{id}") => path.project_id = value,
            "id" if matched.starts_with("/dictionaries/{id}") => path.dictionary_id = value,
            "media_id" => path.media_file_id = value,
            "flashcard_id" if !matched.contains("/anki/pending-deletions/") => {
                path.flashcard_id = value;
            }
            "track_id" => path.subtitle_track_id = value,
            "alignment_id" => path.alignment_id = value,
            "answer_id" => path.review_answer_id = value,
            _ => {}
        }
    }
    path
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_id_of_a_project_path_as_a_project() {
        let path = owned_path_of("/projects/{id}/media", [("id", "p")]);
        assert_eq!(path.project_id.as_deref(), Some("p"));
    }

    #[test]
    fn reads_the_id_of_a_dictionary_media_path_as_a_dictionary() {
        let path = owned_path_of(
            "/dictionaries/{id}/media/{path}",
            [("id", "d"), ("path", "a.png")],
        );
        assert_eq!(path.dictionary_id.as_deref(), Some("d"));
    }

    #[test]
    fn ignores_the_id_of_an_import_job() {
        let path = owned_path_of("/dictionaries/imports/{id}", [("id", "job")]);
        assert_eq!(path, OwnedPath::default());
    }

    #[test]
    fn ignores_the_id_of_a_user() {
        let path = owned_path_of("/users/{id}", [("id", "u")]);
        assert_eq!(path, OwnedPath::default());
    }

    #[test]
    fn reads_the_answer_id_of_an_undo() {
        let path = owned_path_of(
            "/projects/{id}/review/answers/{answer_id}",
            [("id", "p"), ("answer_id", "a")],
        );
        assert_eq!(path.review_answer_id.as_deref(), Some("a"));
    }

    #[test]
    fn leaves_out_the_flashcard_of_a_pending_anki_deletion() {
        let path = owned_path_of(
            "/projects/{id}/anki/pending-deletions/{flashcard_id}",
            [("id", "p"), ("flashcard_id", "f")],
        );
        assert_eq!(path.flashcard_id, None);
    }

    #[test]
    fn reads_the_flashcard_of_a_hold() {
        let path = owned_path_of(
            "/projects/{id}/review/holds/{flashcard_id}",
            [("id", "p"), ("flashcard_id", "f")],
        );
        assert_eq!(path.flashcard_id.as_deref(), Some("f"));
    }
}
