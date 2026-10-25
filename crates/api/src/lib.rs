//! The HTTP API: the axum router, authentication, the OpenAPI document, and the server
//! lifecycle. Used by the standalone server and by the embedded server of the native app.

mod account_mail;
pub mod accounts;
pub mod anki_media;
pub mod anki_package_delivery;
pub mod anki_selection;
pub mod auth;
mod body_files;
pub mod config;
pub mod dictionary_dumps;
pub mod embedded_subtitle_tracks;
mod fetched_subtitle_files;
mod fetched_subtitles;
pub mod file_download;
pub mod found_subtitle_tracks;
pub mod import_jobs;
pub mod import_progress_sink;
mod library_covers;
mod library_cues;
pub mod library_paths;
mod library_proposals;
mod library_publish;
mod library_segments;
mod library_tracks;
pub mod local_dictionary_files;
pub mod local_path;
pub mod local_table_file;
pub mod lookup;
pub mod mail;
pub mod media_copy_files;
pub mod media_source_jobs;
mod now_ms;
pub mod pairing_codes;
mod plugin_compile_cache;
pub mod plugins;
pub mod router;
pub mod routes;
pub mod serve;
pub mod server_control;
pub mod sidecar_subtitle_tracks;
mod source_update;
pub mod state;
pub mod sync;
#[cfg(test)]
mod typescript_constants;
mod unread_body;
pub mod web_app;

pub use auth::error_body::{ApiError, ApiFailure};
pub use auth::principal::Principal;
pub use config::{
    AccountsConfig, ApiConfig, MailConfig, MailTransport, SmtpConfig, SmtpCredentials,
    SmtpSecurity, UploadsConfig,
};
pub use plugins::PluginRegistry;
pub use router::{build_router, openapi_document};
pub use serve::{ListenerHandle, ServeError, ServeOptions, ServerHandle, serve};
pub use state::AppState;
