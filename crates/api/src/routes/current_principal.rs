use axum::extract::State;
use axum::{Extension, Json};
use easyimmerse_core::account::AccountUser;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::auth::principal::Principal;
use crate::state::AppState;

/// Who a request comes from: the holder of the launch token, who owns the machine the server runs on, or an account.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export)]
pub enum CurrentPrincipal {
    Launch,
    Account { user: AccountUser },
}

/// Tells who the request's token belongs to.
#[utoipa::path(
    get,
    path = "/auth/me",
    tag = "auth",
    operation_id = "getCurrentPrincipal",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "Who the token belongs to", body = CurrentPrincipal),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_current_principal(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
) -> Result<Json<CurrentPrincipal>, ApiFailure> {
    match principal {
        Principal::Launch => Ok(Json(CurrentPrincipal::Launch)),
        Principal::Account { user_id, .. } => {
            let user = state
                .with_storage(move |storage| storage.get_user(&user_id))
                .await?;
            Ok(Json(CurrentPrincipal::Account { user }))
        }
    }
}
