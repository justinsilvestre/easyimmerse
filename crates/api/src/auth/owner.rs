use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use easyimmerse_storage::OwnerId;

use crate::auth::error_body::{ApiFailure, unauthorized};
use crate::auth::principal::Principal;

/// The owner of the data a request works with: the principal's own.
pub struct Owner(pub OwnerId);

impl<S: Send + Sync> FromRequestParts<S> for Owner {
    type Rejection = ApiFailure;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, ApiFailure> {
        parts
            .extensions
            .get::<Principal>()
            .map(|principal| Owner(principal.owner_id()))
            .ok_or_else(unauthorized)
    }
}
