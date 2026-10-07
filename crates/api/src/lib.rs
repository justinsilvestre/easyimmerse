//! The HTTP API: the axum router, authentication, the OpenAPI document, and the server
//! lifecycle. Used by the standalone server and by the embedded server of the native app.

pub mod auth;
pub mod config;
mod fetched_subtitles;
pub mod local_dictionary_files;
pub mod local_path;
pub mod local_table_file;
pub mod media_source_jobs;
pub mod plugins;
pub mod router;
pub mod routes;
pub mod serve;
pub mod state;

pub use auth::error_body::{ApiError, ApiFailure};
pub use auth::token_kind::TokenKind;
pub use config::ApiConfig;
pub use plugins::PluginRegistry;
pub use router::{build_router, openapi_document};
pub use serve::{ServeError, ServeOptions, ServerHandle, serve};
pub use state::AppState;
