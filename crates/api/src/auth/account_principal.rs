use axum::extract::FromRequestParts;
use axum::http::request::Parts;

use crate::auth::error_body::{ApiFailure, not_an_account, unauthorized};
use crate::auth::principal::Principal;

/// The account a request comes from, and the session it presented.
/// A route that takes it answers the launch principal with 403 `not_an_account`.
pub struct AccountPrincipal {
    pub user_id: String,
    pub session_id: String,
}

impl<S: Send + Sync> FromRequestParts<S> for AccountPrincipal {
    type Rejection = ApiFailure;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, ApiFailure> {
        match parts.extensions.get::<Principal>() {
            Some(Principal::Account {
                user_id,
                session_id,
                ..
            }) => Ok(AccountPrincipal {
                user_id: user_id.clone(),
                session_id: session_id.clone(),
            }),
            Some(Principal::Launch) => Err(not_an_account()),
            None => Err(unauthorized()),
        }
    }
}
