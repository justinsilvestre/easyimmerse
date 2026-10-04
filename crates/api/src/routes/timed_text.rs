use axum::extract::State;
use axum::{Extension, Json};
use easyimmerse_core::text_source::TextSource;
use easyimmerse_core::timed_text::{ParseTimedTextRequest, TimedTextTrack, parse_timed_text};

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::auth::token_kind::TokenKind;
use crate::local_path::resolve_local_text;
use crate::state::AppState;

#[utoipa::path(
    post,
    path = "/timed-text/parse",
    tag = "timed_text",
    operation_id = "parseTimedText",
    security(("bearer_token" = [])),
    request_body = ParseTimedTextRequest,
    responses(
        (status = 200, description = "The parsed cues", body = TimedTextTrack),
        (status = 400, description = "The text could not be parsed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No file at the given path", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn parse_timed_text_route(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Json(request): Json<ParseTimedTextRequest>,
) -> Result<Json<TimedTextTrack>, ApiFailure> {
    let text = resolve_text_source(&state, token, request.source).await?;
    Ok(Json(parse_timed_text(&text, request.format)?))
}

/// The text of a source. A `path` source is read only for tokens that may read local paths.
pub async fn resolve_text_source(
    state: &AppState,
    token: TokenKind,
    source: TextSource,
) -> Result<String, ApiFailure> {
    match source {
        TextSource::Inline { text } => Ok(text),
        TextSource::Path { path } => resolve_local_text(token, &state.config, &path).await,
    }
}
