use std::sync::Arc;

use axum::extract::DefaultBodyLimit;
use axum::middleware::from_fn_with_state;
use axum::{Extension, Router};
use tower_http::cors::{AllowHeaders, CorsLayer};
use tower_http::trace::TraceLayer;
use utoipa::openapi::OpenApi;
use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};
use utoipa::{Modify, OpenApi as _};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::auth::bearer_token::require_bearer_token;
use crate::auth::host_check::check_host;
use crate::routes::{
    alignments, anki, anki_exported, anki_package, anki_pending_deletions, auth_server,
    conversion_cache, conversion_capabilities, conversions, current_principal, dictionaries,
    dictionary_batch_lookup, dictionary_imports, dictionary_lookup, dictionary_media, documents,
    flashcards, health, local_dictionaries, media, media_availability, media_clip, media_frame,
    media_import, media_playback_method, media_stream, media_tracks, media_waveform, openapi,
    pairing, plugins, preferences, projects, review, sessions, source_form, subtitles, timed_text,
    users,
};
use crate::state::AppState;
use crate::web_app::web_app_router;

/// Dictionaries can be hundreds of megabytes, so the default two-megabyte limit is raised.
const MAX_REQUEST_BODY_BYTES: usize = 1024 * 1024 * 1024;
/// The routes that need no token take only small JSON bodies.
const MAX_PUBLIC_REQUEST_BODY_BYTES: usize = 16 * 1024;

/// Builds the complete application router together with its OpenAPI document.
///
/// Every route checks the `Host` header. Every route except `/health`, `/auth/server`,
/// `/auth/signup`, `/auth/login` and `/pairing/claim` requires a bearer token.
/// When the state names a web app directory, every other path serves its files, without a token.
pub fn build_router(state: AppState) -> (Router, OpenApi) {
    let document = openapi_document();
    let (protected, _) = protected_routes().split_for_parts();
    let protected = protected
        .layer(Extension(Arc::new(document.clone())))
        .layer(from_fn_with_state(state.clone(), require_bearer_token));
    let (public, _) = public_routes().split_for_parts();
    let public = public.layer(DefaultBodyLimit::max(MAX_PUBLIC_REQUEST_BODY_BYTES));
    let mut router = protected.merge(public);
    // The web app's files need no token, so their fallback comes after the token layer.
    if let Some(dir) = &state.web_app_dir {
        router = router.fallback_service(web_app_router(dir));
    }
    let router = router
        .layer(DefaultBodyLimit::max(MAX_REQUEST_BODY_BYTES))
        .layer(cors_layer())
        .layer(from_fn_with_state(Arc::clone(&state.config), check_host))
        .layer(TraceLayer::new_for_http().make_span_with(request_span))
        .with_state(state);
    (router, document)
}

/// Records the method and the path of a request, but not its query,
/// since the media routes accept a token as a query parameter.
fn request_span(request: &axum::extract::Request) -> tracing::Span {
    tracing::debug_span!(
        "request",
        method = %request.method(),
        path = %request.uri().path(),
    )
}

/// Allows any origin, since the bearer token is what protects the API.
/// The allowed headers mirror each preflight request because browsers do not let the
/// `*` wildcard stand for the `Authorization` header.
fn cors_layer() -> CorsLayer {
    CorsLayer::permissive().allow_headers(AllowHeaders::mirror_request())
}

/// Builds the OpenAPI document without a running server.
pub fn openapi_document() -> OpenApi {
    let (_, mut document) = protected_routes().split_for_parts();
    let (_, public) = public_routes().split_for_parts();
    document.merge(public);
    document
}

fn protected_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::with_openapi(ApiDoc::openapi())
        .routes(routes!(openapi::get_openapi_document))
        .routes(routes!(projects::list_projects, projects::create_project))
        .routes(routes!(
            projects::get_project,
            projects::update_project,
            projects::delete_project
        ))
        .routes(routes!(projects::mark_project_opened))
        .routes(routes!(
            flashcards::list_flashcards,
            flashcards::create_flashcard
        ))
        .routes(routes!(
            flashcards::update_flashcard,
            flashcards::delete_flashcard
        ))
        .routes(routes!(review::get_review_summary))
        .routes(routes!(review::list_review_counts))
        .routes(routes!(review::get_review_queue))
        .routes(routes!(review::answer_review))
        .routes(routes!(review::undo_review_answer))
        .routes(routes!(review::raise_review_allowance))
        .routes(routes!(review::hold_review_card, review::lift_review_hold))
        .routes(routes!(anki_package::export_anki_package))
        .routes(routes!(anki_exported::record_anki_exported))
        .routes(routes!(anki::render_anki_notes))
        .routes(routes!(anki::record_anki_notes_sent))
        .routes(routes!(anki::set_anki_connect))
        .routes(routes!(anki_pending_deletions::list_anki_pending_deletions))
        .routes(routes!(anki_pending_deletions::clear_anki_pending_deletion))
        .routes(routes!(
            anki_pending_deletions::clear_anki_pending_deletions
        ))
        .routes(routes!(media::list_media_files, media::add_media_file))
        .routes(routes!(media::remove_media_file))
        .routes(routes!(media_availability::get_media_availability))
        .routes(routes!(media_import::get_import_form))
        .routes(routes!(media_import::submit_import_step))
        .routes(routes!(plugins::get_media_source_job))
        .routes(routes!(plugins::list_plugins))
        .routes(routes!(source_form::get_source_form))
        .routes(routes!(source_form::submit_source_step))
        .routes(routes!(media_stream::stream_media_file))
        .routes(routes!(media_frame::get_media_frame))
        .routes(routes!(media_clip::get_media_clip))
        .routes(routes!(media_tracks::get_media_tracks))
        .routes(routes!(media_tracks::list_embedded_subtitle_tracks))
        .routes(routes!(
            subtitles::list_subtitle_tracks,
            subtitles::add_subtitle_track
        ))
        .routes(routes!(subtitles::remove_subtitle_track))
        .routes(routes!(subtitles::get_subtitle_cues))
        .routes(routes!(subtitles::set_subtitle_selection))
        .routes(routes!(
            alignments::list_alignments,
            alignments::add_alignment
        ))
        .routes(routes!(alignments::remove_alignment))
        .routes(routes!(alignments::set_translation_document))
        .routes(routes!(
            media_tracks::set_media_track_selection,
            media_tracks::clear_media_track_selection
        ))
        .routes(routes!(media_playback_method::choose_media_playback_method))
        .routes(routes!(media_waveform::get_media_waveform))
        .routes(routes!(conversions::get_conversion_playlist))
        .routes(routes!(conversions::get_conversion_init_segment))
        .routes(routes!(conversions::get_conversion_segment))
        .routes(routes!(conversion_cache::get_conversion_cache))
        .routes(routes!(conversion_cache::clear_conversion_cache))
        .routes(routes!(conversion_cache::set_conversion_cache_budget))
        .routes(routes!(
            conversion_capabilities::get_conversion_capabilities
        ))
        .routes(routes!(
            preferences::get_preference,
            preferences::set_preference
        ))
        .routes(routes!(timed_text::parse_timed_text_route))
        .routes(routes!(documents::parse_document_route))
        .routes(routes!(documents::parse_local_document))
        .routes(routes!(
            dictionaries::import_dictionary,
            dictionaries::list_dictionaries
        ))
        .routes(routes!(local_dictionaries::import_local_dictionary))
        .routes(routes!(dictionary_imports::get_import_job))
        .routes(routes!(local_dictionaries::preview_local_dictionary_table))
        .routes(routes!(dictionaries::preview_dictionary_table))
        .routes(routes!(dictionaries::delete_dictionary))
        .routes(routes!(dictionary_lookup::lookup_text))
        .routes(routes!(dictionary_batch_lookup::lookup_texts))
        .routes(routes!(dictionary_media::get_dictionary_media))
        .routes(routes!(current_principal::get_current_principal))
        .routes(routes!(sessions::log_out))
        .routes(routes!(users::list_users, users::create_user))
        .routes(routes!(users::set_user_role))
        .routes(routes!(users::delete_user))
        .routes(routes!(pairing::issue_pairing_code))
        .routes(routes!(pairing::current_pairing_code))
}

fn public_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(health::get_health))
        .routes(routes!(auth_server::get_server_auth_info))
        .routes(routes!(sessions::sign_up))
        .routes(routes!(sessions::log_in))
        .routes(routes!(pairing::claim_pairing_code))
}

#[derive(utoipa::OpenApi)]
#[openapi(
    info(title = "easyImmerse API", description = "The REST API of easyImmerse."),
    modifiers(&BearerTokenScheme),
)]
struct ApiDoc;

struct BearerTokenScheme;

impl Modify for BearerTokenScheme {
    fn modify(&self, document: &mut OpenApi) {
        let components = document.components.get_or_insert_default();
        components.add_security_scheme(
            "bearer_token",
            SecurityScheme::Http(HttpBuilder::new().scheme(HttpAuthScheme::Bearer).build()),
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn documents_the_health_route() {
        assert!(openapi_document().paths.paths.contains_key("/health"));
    }

    #[test]
    fn documents_the_error_body_schema() {
        let components = openapi_document().components.unwrap_or_default();
        assert!(components.schemas.contains_key("ApiError"));
    }

    /// Rewrites the committed document when `EASYIMMERSE_UPDATE_OPENAPI` is set,
    /// and otherwise checks that the committed document is current.
    #[test]
    fn the_committed_document_is_current() {
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/openapi.json");
        let built = format!("{}\n", openapi_document().to_pretty_json().unwrap());
        if std::env::var_os("EASYIMMERSE_UPDATE_OPENAPI").is_some() {
            std::fs::write(path, built).unwrap();
        } else {
            let committed = std::fs::read_to_string(path).unwrap().replace("\r\n", "\n");
            assert_eq!(committed, built);
        }
    }
}
