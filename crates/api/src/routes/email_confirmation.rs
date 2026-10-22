use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::account_mail::send_confirmation_mail;
use crate::accounts::{AccountsError, confirm_email};
use crate::auth::account_principal::AccountPrincipal;
use crate::auth::error_body::{ApiError, ApiFailure, mail_unavailable};
use crate::now_ms::now_ms;
use crate::routes::sessions::ensure_accounts_enabled;
use crate::state::AppState;

/// The token of a mailed link, which the link carries as a query parameter.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ConfirmEmailRequest {
    pub token: String,
}

/// Confirms the email address of an account with the token of the link mailed to it. Needs no token.
#[utoipa::path(
    post,
    path = "/auth/confirm-email",
    tag = "auth",
    operation_id = "confirmEmail",
    request_body = ConfirmEmailRequest,
    responses(
        (status = 204, description = "The email address is confirmed"),
        (status = 400, description = "`invalid_link`: the token is unknown, used or expired", body = ApiError),
        (status = 403, description = "`accounts_disabled`: the server has no accounts", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn confirm_email_address(
    State(state): State<AppState>,
    Json(request): Json<ConfirmEmailRequest>,
) -> Result<StatusCode, ApiFailure> {
    ensure_accounts_enabled(&state.config)?;
    state
        .with_accounts(move |storage| confirm_email(storage, &request.token, now_ms()))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Mails the account a new link that confirms its email address. The link of an earlier mail stops working.
#[utoipa::path(
    post,
    path = "/auth/confirmation-email",
    tag = "auth",
    operation_id = "resendConfirmationEmail",
    security(("bearer_token" = [])),
    responses(
        (status = 202, description = "The mail is on its way"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`not_an_account`: the launch token belongs to no account", body = ApiError),
        (status = 409, description = "`already_confirmed`: the email address is already confirmed", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 429, description = "`too_many_attempts`: a confirmation mail was sent less than a minute ago", body = ApiError,
            headers(("Retry-After" = u64, description = "The seconds to wait before trying again"))),
        (status = 503, description = "`mail_unavailable`: the server does not send email", body = ApiError),
    ),
)]
pub async fn resend_confirmation_email(
    State(state): State<AppState>,
    account: AccountPrincipal,
) -> Result<StatusCode, ApiFailure> {
    if state.mail.is_none() {
        return Err(mail_unavailable());
    }
    let user_id = account.user_id.clone();
    let user = state
        .with_storage(move |storage| storage.get_user(&user_id))
        .await?;
    if user.email_confirmed_at_ms.is_some() {
        return Err(AccountsError::AlreadyConfirmed.into());
    }
    state.confirmation_mails.begin_mail(&user.id, now_ms())?;
    send_confirmation_mail(&state, user);
    Ok(StatusCode::ACCEPTED)
}
