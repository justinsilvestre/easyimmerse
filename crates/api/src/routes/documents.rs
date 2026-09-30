use axum::body::Bytes;
use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::http::header::CONTENT_TYPE;
use axum::{Extension, Json};
use easyimmerse_core::document::{Document, DocumentFormat, parse_document};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::{IntoParams, ToSchema};

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::auth::token_kind::TokenKind;
use crate::local_path::resolve_local_path;
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema, IntoParams)]
#[into_params(parameter_in = Query)]
#[ts(export)]
pub struct ParseDocumentQuery {
    /// Overrides format detection.
    pub format: Option<DocumentFormat>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ParseLocalDocumentRequest {
    pub path: String,
    /// Overrides format detection.
    pub format: Option<DocumentFormat>,
}

/// Parses a document sent as the raw request body.
///
/// The format is taken from the `format` query parameter, then from the `Content-Type`
/// header, and otherwise detected from the bytes.
#[utoipa::path(
    post,
    path = "/documents/parse",
    tag = "documents",
    operation_id = "parseDocument",
    security(("bearer_token" = [])),
    params(ParseDocumentQuery),
    request_body(
        description = "The document file",
        content(
            ("application/epub+zip"),
            ("text/plain"),
        ),
    ),
    responses(
        (status = 200, description = "The parsed document", body = Document),
        (status = 400, description = "The document could not be parsed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn parse_document_route(
    Query(query): Query<ParseDocumentQuery>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Json<Document>, ApiFailure> {
    let format = query.format.or_else(|| format_from_content_type(&headers));
    Ok(Json(parse_document(&body, format)?))
}

#[utoipa::path(
    post,
    path = "/documents/parse-local",
    tag = "documents",
    operation_id = "parseLocalDocument",
    security(("bearer_token" = [])),
    request_body = ParseLocalDocumentRequest,
    responses(
        (status = 200, description = "The parsed document", body = Document),
        (status = 400, description = "The document could not be parsed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No file at the given path", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn parse_local_document(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Json(request): Json<ParseLocalDocumentRequest>,
) -> Result<Json<Document>, ApiFailure> {
    let bytes = resolve_local_path(token, &state.config, &request.path).await?;
    Ok(Json(parse_document(&bytes, request.format)?))
}

fn format_from_content_type(headers: &HeaderMap) -> Option<DocumentFormat> {
    let content_type = headers.get(CONTENT_TYPE)?.to_str().ok()?;
    match content_type.split(';').next()?.trim() {
        "application/epub+zip" => Some(DocumentFormat::Epub),
        "text/plain" => Some(DocumentFormat::PlainText),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use axum::http::HeaderValue;

    use super::*;

    fn headers_with(content_type: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_str(content_type).unwrap());
        headers
    }

    #[test]
    fn maps_the_epub_content_type() {
        assert_eq!(
            format_from_content_type(&headers_with("application/epub+zip")),
            Some(DocumentFormat::Epub)
        );
    }

    #[test]
    fn ignores_content_type_parameters() {
        assert_eq!(
            format_from_content_type(&headers_with("text/plain; charset=utf-8")),
            Some(DocumentFormat::PlainText)
        );
    }

    #[test]
    fn leaves_unknown_content_types_to_detection() {
        assert_eq!(
            format_from_content_type(&headers_with("application/octet-stream")),
            None
        );
    }
}
