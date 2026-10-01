use std::sync::Arc;

use axum::extract::DefaultBodyLimit;
use axum::middleware::from_fn_with_state;
use axum::{Extension, Router};
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use utoipa::openapi::OpenApi;
use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};
use utoipa::{Modify, OpenApi as _};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::auth::bearer_token::require_bearer_token;
use crate::auth::host_check::check_host;
use crate::routes::{
    dictionaries, dictionary_assets, dictionary_lookup, documents, flashcards, health, media,
    media_stream, openapi, preferences, projects, subtitle_cues, timed_text,
};
use crate::state::AppState;

/// Dictionaries can be hundreds of megabytes, so the default two-megabyte limit is raised.
const MAX_REQUEST_BODY_BYTES: usize = 1024 * 1024 * 1024;

/// Builds the complete application router together with its OpenAPI document.
///
/// Every route checks the `Host` header. Every route except `/health` requires the bearer
/// token.
pub fn build_router(state: AppState) -> (Router, OpenApi) {
    let document = openapi_document();
    let (protected, _) = protected_routes().split_for_parts();
    let protected = protected
        .layer(Extension(Arc::new(document.clone())))
        .layer(from_fn_with_state(
            Arc::clone(&state.config),
            require_bearer_token,
        ));
    let (public, _) = public_routes().split_for_parts();
    let router = protected
        .merge(public)
        .layer(DefaultBodyLimit::max(MAX_REQUEST_BODY_BYTES))
        .layer(CorsLayer::permissive())
        .layer(from_fn_with_state(Arc::clone(&state.config), check_host))
        .layer(TraceLayer::new_for_http())
        .with_state(state);
    (router, document)
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
        .routes(routes!(projects::get_project, projects::delete_project))
        .routes(routes!(projects::update_project_settings))
        .routes(routes!(projects::mark_project_opened))
        .routes(routes!(media::add_media_file))
        .routes(routes!(media::set_media_duration))
        .routes(routes!(media::remove_media_file))
        .routes(routes!(media::add_subtitle_track))
        .routes(routes!(media::remove_subtitle_track))
        .routes(routes!(subtitle_cues::get_subtitle_cues))
        .routes(routes!(subtitle_cues::list_embedded_subtitles))
        .routes(routes!(media_stream::stream_media))
        .routes(routes!(
            flashcards::list_flashcards,
            flashcards::create_flashcard
        ))
        .routes(routes!(
            flashcards::update_flashcard,
            flashcards::delete_flashcard
        ))
        .routes(routes!(flashcards::draft_flashcard_route))
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
        .routes(routes!(dictionaries::import_local_dictionary))
        .routes(routes!(dictionaries::delete_dictionary))
        .routes(routes!(dictionaries::set_dictionary_languages))
        .routes(routes!(dictionary_assets::get_dictionary_asset))
        .routes(routes!(dictionary_assets::get_dictionary_stylesheet))
        .routes(routes!(dictionary_lookup::lookup_term))
        .routes(routes!(dictionary_lookup::lookup_term_everywhere))
}

fn public_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new().routes(routes!(health::get_health))
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
}
