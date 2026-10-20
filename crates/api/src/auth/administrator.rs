use axum::extract::FromRequestParts;
use axum::http::request::Parts;

use crate::auth::error_body::{ApiFailure, forbidden, unauthorized};
use crate::auth::principal::Principal;

/// Proof that the request comes from an administrator: the launch principal or an account with the `administrator` role.
/// A route that takes it answers anyone else with 403 `forbidden`.
pub struct Administrator;

impl<S: Send + Sync> FromRequestParts<S> for Administrator {
    type Rejection = ApiFailure;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, ApiFailure> {
        match parts.extensions.get::<Principal>() {
            Some(principal) if principal.is_administrator() => Ok(Administrator),
            Some(_) => Err(forbidden("only an administrator may do this")),
            None => Err(unauthorized()),
        }
    }
}
