//! The built-in spaced-repetition review of a project's flashcards.
//!
//! Every route takes the client's UTC offset, which places the current time in the user's local day:
//! a day ends at 4 a.m. local time, and new cards are counted per day.

use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::review::{
    ReviewAllowanceRequest, ReviewAnswerRequest, ReviewAnswerResponse, ReviewAnswerUndone,
    ReviewQueue, ReviewSummary,
};
use easyimmerse_srs::ReviewMoment;
use serde::Deserialize;
use utoipa::IntoParams;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::now_ms::now_ms;
use crate::state::AppState;

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct ReviewMomentQuery {
    /// Local time minus UTC, in minutes, as on the user's device: 120 in Central European Summer Time.
    pub utc_offset_min: i32,
}

impl ReviewMomentQuery {
    fn now(&self) -> ReviewMoment {
        ReviewMoment {
            at_ms: now_ms(),
            utc_offset_min: self.utc_offset_min,
        }
    }
}

#[utoipa::path(
    get,
    path = "/projects/{id}/review",
    tag = "review",
    operation_id = "getReviewSummary",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id"), ReviewMomentQuery),
    responses(
        (status = 200, description = "What waits in the project's review today", body = ReviewSummary),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_review_summary(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Query(query): Query<ReviewMomentQuery>,
) -> Result<Json<ReviewSummary>, ApiFailure> {
    let moment = query.now();
    let summary = state
        .with_storage(move |storage| storage.review_summary(&project_id, moment))
        .await?;
    Ok(Json(summary))
}

/// Lists the cards of a review session in the order they are shown: reviews due today, most overdue first;
/// then learning cards due now or within twenty minutes; then the new cards still allowed today, in the order they were made.
#[utoipa::path(
    get,
    path = "/projects/{id}/review/queue",
    tag = "review",
    operation_id = "getReviewQueue",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id"), ReviewMomentQuery),
    responses(
        (status = 200, description = "The session's cards, each with the intervals its ratings would give", body = ReviewQueue),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_review_queue(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Query(query): Query<ReviewMomentQuery>,
) -> Result<Json<ReviewQueue>, ApiFailure> {
    let moment = query.now();
    let queue = state
        .with_storage(move |storage| storage.review_queue(&project_id, moment))
        .await?;
    Ok(Json(queue))
}

/// Records the user's rating of a card, stamped with the server's time, and schedules the card's next review.
#[utoipa::path(
    post,
    path = "/projects/{id}/review/answers",
    tag = "review",
    operation_id = "answerReview",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = ReviewAnswerRequest,
    responses(
        (status = 200, description = "The card's new schedule, the log entry of the answer, and the intervals of its next answer", body = ReviewAnswerResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project, or no such flashcard in it", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn answer_review(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(request): Json<ReviewAnswerRequest>,
) -> Result<Json<ReviewAnswerResponse>, ApiFailure> {
    let answered = state
        .with_storage(move |storage| storage.answer_review(&project_id, &request, now_ms()))
        .await?;
    Ok(Json(answered))
}

/// Undoes the project's latest answer and restores the card's schedule from before it.
#[utoipa::path(
    delete,
    path = "/projects/{id}/review/answers/{answered_at_ms}",
    tag = "review",
    operation_id = "undoReviewAnswer",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("answered_at_ms" = u64, Path, description = "The time of the answer, as its log entry gives it"),
        ReviewMomentQuery,
    ),
    responses(
        (status = 200, description = "The card as it stood before the answer", body = ReviewAnswerUndone),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project, or no answer at that time in it", body = ApiError),
        (status = 409, description = "The answer is not the project's latest", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn undo_review_answer(
    State(state): State<AppState>,
    Path((project_id, answered_at_ms)): Path<(ProjectId, u64)>,
    Query(query): Query<ReviewMomentQuery>,
) -> Result<Json<ReviewAnswerUndone>, ApiFailure> {
    let moment = query.now();
    let undone = state
        .with_storage(move |storage| {
            storage.undo_review_answer(&project_id, answered_at_ms, moment)
        })
        .await?;
    Ok(Json(undone))
}

/// Raises the number of new cards the project's review introduces today, as "Learn 20 more" does.
#[utoipa::path(
    post,
    path = "/projects/{id}/review/allowance",
    tag = "review",
    operation_id = "raiseReviewAllowance",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = ReviewAllowanceRequest,
    responses(
        (status = 204, description = "Today's allowance of new cards was raised"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn raise_review_allowance(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(request): Json<ReviewAllowanceRequest>,
) -> Result<StatusCode, ApiFailure> {
    state
        .with_storage(move |storage| {
            storage.raise_review_allowance(&project_id, &request, now_ms())
        })
        .await?;
    Ok(StatusCode::NO_CONTENT)
}
