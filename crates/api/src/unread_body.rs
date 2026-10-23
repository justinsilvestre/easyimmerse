//! Reading the rest of a small request body that a route rejected without reading.
//!
//! When a response goes out before its request body is read, the HTTP server closes the connection.
//! Body bytes that arrive after that make the operating system reset the connection,
//! and on Windows the reset discards the response before the client reads it.

use std::pin::Pin;
use std::sync::{Arc, Mutex, MutexGuard};
use std::task::{Context, Poll};
use std::time::Duration;

use axum::body::{Body, BodyDataStream};
use axum::extract::Request;
use axum::http::header::{CONTENT_LENGTH, EXPECT};
use axum::middleware::Next;
use axum::response::Response;
use futures_util::{Stream, StreamExt};

/// Longer bodies are left unread, since reading them would cost more than a closed connection.
const MAX_DRAINED_BYTES: u64 = 1024 * 1024;
/// How long a client that stops sending its body may hold up the response.
const DRAIN_TIMEOUT: Duration = Duration::from_secs(5);

/// Runs the request, then reads what is left of its body before the response goes out.
pub async fn drain_unread_body(request: Request, next: Next) -> Response {
    if !is_worth_draining(&request) {
        return next.run(request).await;
    }
    let (parts, body) = request.into_parts();
    let shared = SharedBody::new(body);
    let handed_on = Body::from_stream(shared.clone());
    let response = next.run(Request::from_parts(parts, handed_on)).await;
    let _ = tokio::time::timeout(DRAIN_TIMEOUT, shared.drain(MAX_DRAINED_BYTES)).await;
    response
}

/// Whether the body is short enough to read. A client that waits for `100 Continue` sends no body
/// unless the route reads it, so its body needs no draining.
fn is_worth_draining(request: &Request) -> bool {
    let headers = request.headers();
    let length = headers
        .get(CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok()?.parse::<u64>().ok());
    !headers.contains_key(EXPECT) && length.is_none_or(|length| length <= MAX_DRAINED_BYTES)
}

/// A request body that the route reads through one handle while the middleware keeps another.
#[derive(Clone)]
struct SharedBody(Arc<Mutex<BodyDataStream>>);

impl SharedBody {
    fn new(body: Body) -> Self {
        Self(Arc::new(Mutex::new(body.into_data_stream())))
    }

    fn lock(&self) -> MutexGuard<'_, BodyDataStream> {
        self.0
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    /// Reads and discards up to `limit` bytes, unless a task the route started still holds the body.
    async fn drain(mut self, limit: u64) {
        if Arc::strong_count(&self.0) > 1 {
            return;
        }
        let mut read = 0;
        while read <= limit {
            match self.next().await {
                Some(Ok(chunk)) => read += chunk.len() as u64,
                _ => return,
            }
        }
    }
}

impl Stream for SharedBody {
    type Item = <BodyDataStream as Stream>::Item;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        self.lock().poll_next_unpin(cx)
    }
}
