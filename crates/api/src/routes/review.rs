//! The built-in spaced-repetition review of a project's flashcards.
//!
//! Every route takes the client's UTC offset, which places the current time in the user's local day:
//! a day ends at 4 a.m. local time, and new cards are counted per day.

use std::sync::Arc;
use std::sync::atomic::Ordering;

use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::review::{
    ListReviewCountsResponse, ReviewAllowanceRequest, ReviewAnswerRequest, ReviewAnswerResponse,
    ReviewAnswerUndone, ReviewHoldRequest, ReviewQueue, ReviewSummary,
};
use easyimmerse_srs::{ReviewMoment, fit_parameters};
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

/// What waits in each project's review today, counted as the queue counts it, as the list of projects shows it.
#[utoipa::path(
    get,
    path = "/review/counts",
    tag = "review",
    operation_id = "listReviewCounts",
    security(("bearer_token" = [])),
    params(ReviewMomentQuery),
    responses(
        (status = 200, description = "The counts of each project's review today", body = ListReviewCountsResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_review_counts(
    State(state): State<AppState>,
    Query(query): Query<ReviewMomentQuery>,
) -> Result<Json<ListReviewCountsResponse>, ApiFailure> {
    let moment = query.now();
    let projects = state
        .with_storage(move |storage| storage.list_review_counts(moment))
        .await?;
    Ok(Json(ListReviewCountsResponse { projects }))
}

/// Lists the cards of a review session in the order they are shown: reviews due today, most overdue first, up to two hundred a day;
/// then learning cards due now or within twenty minutes; then the new cards still allowed today, in the order they were made.
/// Cards the user buried or suspended are left out.
/// Starting a session also fits the FSRS parameters to the user's answers in the background, when the last fit is thirty days old.
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
    fit_parameters_when_due(&state, moment);
    Ok(Json(queue))
}

/// Fits the FSRS parameters on a blocking thread when a fit is due and none is running, without holding up the response.
/// The fit takes seconds, so it reads the log and keeps its result in two short calls to the database rather than one long one.
/// A fit that fails leaves the fit due, so that the next session tries again.
fn fit_parameters_when_due(state: &AppState, moment: ReviewMoment) {
    let is_fitting = Arc::clone(&state.is_fitting_review_parameters);
    if is_fitting.swap(true, Ordering::AcqRel) {
        return;
    }
    let state = state.clone();
    tokio::spawn(async move {
        fit_and_save(&state, moment).await;
        is_fitting.store(false, Ordering::Release);
    });
}

async fn fit_and_save(state: &AppState, moment: ReviewMoment) {
    let log = state
        .with_storage(move |storage| storage.log_to_fit(moment))
        .await;
    let Ok(Some(log)) = log else { return };
    let fitted = tokio::task::spawn_blocking(move || fit_parameters(&log, moment)).await;
    let weights = match fitted {
        Ok(Ok(Some(weights))) => weights,
        Ok(Ok(None)) => return,
        Ok(Err(error)) => {
            return tracing::warn!("the review parameters could not be fitted: {error}");
        }
        Err(error) => return tracing::warn!("the review parameter fit stopped: {error}"),
    };
    let saved = state
        .with_storage(move |storage| storage.save_review_parameters(&weights, moment.at_ms))
        .await;
    if saved.is_err() {
        tracing::warn!("the fitted review parameters could not be saved");
    }
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

/// Sets a card aside from the review: buries it until the user's next day begins at 4 a.m., or suspends it until they unsuspend it.
#[utoipa::path(
    put,
    path = "/projects/{id}/review/holds/{flashcard_id}",
    tag = "review",
    operation_id = "holdReviewCard",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("flashcard_id" = String, Path, description = "The flashcard id"),
    ),
    request_body = ReviewHoldRequest,
    responses(
        (status = 204, description = "The card was set aside"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project, or no such flashcard in it", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn hold_review_card(
    State(state): State<AppState>,
    Path((project_id, flashcard_id)): Path<(ProjectId, FlashcardId)>,
    Json(request): Json<ReviewHoldRequest>,
) -> Result<StatusCode, ApiFailure> {
    state
        .with_storage(move |storage| {
            storage.hold_review_card(&project_id, &flashcard_id, &request, now_ms())
        })
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Brings a card back into the review, as unburying or unsuspending it does. A card that was not set aside stays as it is.
#[utoipa::path(
    delete,
    path = "/projects/{id}/review/holds/{flashcard_id}",
    tag = "review",
    operation_id = "liftReviewHold",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("flashcard_id" = String, Path, description = "The flashcard id"),
    ),
    responses(
        (status = 204, description = "The card is back in the review"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project, or no such flashcard in it", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn lift_review_hold(
    State(state): State<AppState>,
    Path((project_id, flashcard_id)): Path<(ProjectId, FlashcardId)>,
) -> Result<StatusCode, ApiFailure> {
    state
        .with_storage(move |storage| storage.lift_review_hold(&project_id, &flashcard_id))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Raises the number of new cards, or of reviews, the project's review shows today, as "Learn 20 more" and "Review 100 more" do.
#[utoipa::path(
    post,
    path = "/projects/{id}/review/allowance",
    tag = "review",
    operation_id = "raiseReviewAllowance",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = ReviewAllowanceRequest,
    responses(
        (status = 204, description = "Today's allowance of new cards or reviews was raised"),
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
