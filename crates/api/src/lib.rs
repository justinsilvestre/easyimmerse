//! The HTTP API: the axum router, authentication, the OpenAPI document, and the server
//! lifecycle. Used by the standalone server and by the embedded server of the native app.

pub mod auth;
pub mod config;
pub mod embedded_subtitle_tracks;
pub mod found_subtitle_tracks;
pub mod import_jobs;
pub mod import_progress_sink;
pub mod local_dictionary_files;
pub mod local_path;
pub mod local_table_file;
pub mod lookup_pool;
pub mod lookup_rows;
pub mod router;
pub mod routes;
pub mod serve;
pub mod sidecar_subtitle_tracks;
pub mod state;

pub use auth::error_body::{ApiError, ApiFailure};
pub use auth::token_kind::TokenKind;
pub use config::ApiConfig;
pub use router::{build_router, openapi_document};
pub use serve::{ServeError, ServeOptions, ServerHandle, serve};
pub use state::AppState;
