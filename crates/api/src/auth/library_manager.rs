use axum::extract::FromRequestParts;
use axum::http::request::Parts;

use crate::auth::error_body::{ApiFailure, forbidden, unauthorized};
use crate::auth::principal::Principal;

/// Proof that the request comes from someone who manages the library:
/// the launch principal, an administrator, or an account an administrator let manage it.
/// A route that takes it answers anyone else with 403 `forbidden`.
pub struct LibraryManager;

impl<S: Send + Sync> FromRequestParts<S> for LibraryManager {
    type Rejection = ApiFailure;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, ApiFailure> {
        match parts.extensions.get::<Principal>() {
            Some(principal) if principal.can_manage_library() => Ok(LibraryManager),
            Some(_) => Err(forbidden("only a library manager may do this")),
            None => Err(unauthorized()),
        }
    }
}
