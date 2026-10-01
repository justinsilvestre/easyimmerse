//! The HTTP API: the axum router, authentication, the OpenAPI document, and the server
//! lifecycle. Used by the standalone server and by the embedded server of the native app.

pub mod auth;
pub mod clock;
pub mod config;
pub mod conversion_cleanup;
pub mod conversion_setup;
pub mod local_path;
pub mod media_probe;
pub mod media_source;
pub mod router;
pub mod routes;
pub mod serve;
pub mod state;

mod conversion_failure;

pub use auth::error_body::{ApiError, ApiFailure};
pub use auth::token_kind::TokenKind;
pub use config::ApiConfig;
pub use conversion_setup::start_conversion_service;
pub use router::{build_router, openapi_document};
pub use serve::{ServeError, ServerHandle, serve};
pub use state::AppState;

pub use easyimmerse_conversion::ConversionService;
