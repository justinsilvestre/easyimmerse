//! Responses that hand the client a file to save.

use std::convert::Infallible;
use std::future::{Future, ready};

use axum::body::{Body, Bytes};
use axum::http::HeaderValue;
use futures_util::stream::{self, StreamExt};
use percent_encoding::{NON_ALPHANUMERIC, utf8_percent_encode};

/// A `Content-Disposition` value that asks the client to save the body as `file_name`.
/// It names the file twice: in ASCII for old clients, and in UTF-8 as `filename*`, which current clients prefer.
pub fn attachment_disposition(file_name: &str) -> HeaderValue {
    let ascii: String = file_name
        .chars()
        .map(|character| match character {
            ' '..='~' if character != '"' && character != '\\' => character,
            _ => '_',
        })
        .collect();
    let encoded = utf8_percent_encode(file_name, NON_ALPHANUMERIC);
    HeaderValue::from_str(&format!(
        "attachment; filename=\"{ascii}\"; filename*=UTF-8''{encoded}"
    ))
    .unwrap_or_else(|_| HeaderValue::from_static("attachment"))
}

/// A body of `bytes` that runs `after` once the connection has accepted every byte for sending and before the body ends,
/// so that the client sees the end of the body only after `after` has finished.
/// `after` does not run when the client goes away first.
pub fn body_then(bytes: Vec<u8>, after: impl Future<Output = ()> + Send + 'static) -> Body {
    let data = stream::once(ready(Ok::<_, Infallible>(Bytes::from(bytes))));
    let after = stream::once(after).filter_map(|()| ready(None::<Result<Bytes, Infallible>>));
    Body::from_stream(data.chain(after))
}

/// Replaces the characters that common file systems do not allow in a file name.
pub fn safe_file_name(name: &str) -> String {
    let safe: String = name
        .chars()
        .map(|character| match character {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ if character.is_control() => '_',
            _ => character,
        })
        .collect();
    match safe.trim() {
        "" => "flashcards".to_owned(),
        trimmed => trimmed.to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;
    use std::sync::atomic::{AtomicBool, Ordering};

    use super::*;

    #[test]
    fn names_an_ascii_file_in_both_forms() {
        assert_eq!(
            attachment_disposition("German.apkg"),
            "attachment; filename=\"German.apkg\"; filename*=UTF-8''German%2Eapkg"
        );
    }

    #[test]
    fn replaces_other_characters_in_the_ascii_name() {
        let value = attachment_disposition("Märchen \"1\".apkg");
        assert!(
            value
                .to_str()
                .unwrap()
                .starts_with("attachment; filename=\"M_rchen _1_.apkg\";")
        );
    }

    #[test]
    fn encodes_the_utf8_name_in_full() {
        let value = attachment_disposition("銀河.apkg");
        assert!(
            value
                .to_str()
                .unwrap()
                .ends_with("filename*=UTF-8''%E9%8A%80%E6%B2%B3%2Eapkg")
        );
    }

    #[test]
    fn replaces_path_separators_in_a_file_name() {
        assert_eq!(safe_file_name("a/b\\c: d"), "a_b_c_ d");
    }

    #[test]
    fn names_a_blank_file_name_flashcards() {
        assert_eq!(safe_file_name("  "), "flashcards");
    }

    #[tokio::test]
    async fn the_body_holds_the_bytes() {
        let body = body_then(b"package".to_vec(), async {});
        let bytes = axum::body::to_bytes(body, 1024).await.unwrap();
        assert_eq!(bytes, "package");
    }

    #[tokio::test]
    async fn runs_the_completion_once_the_body_is_read() {
        let ran = Arc::new(AtomicBool::new(false));
        let flag = Arc::clone(&ran);
        let body = body_then(b"package".to_vec(), async move {
            flag.store(true, Ordering::SeqCst);
        });
        axum::body::to_bytes(body, 1024).await.unwrap();
        assert!(ran.load(Ordering::SeqCst));
    }
}
