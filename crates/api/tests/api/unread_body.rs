//! Request bodies that a route rejects without reading, sent the way a slow client sends them.

use std::time::Duration;

use easyimmerse_api::API_PATH_PREFIX;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

use crate::support::spawn_test_server;

const BODY: &str =
    r#"{"email":"other@example.com","password":"correct horse","role":"administrator"}"#;

#[tokio::test(flavor = "multi_thread")]
async fn a_rejected_body_that_arrives_late_leaves_the_connection_open() {
    let server = spawn_test_server(false).await;
    let address = server.base_url.trim_start_matches("http://");
    let mut connection = TcpStream::connect(address).await.unwrap();
    let head = format!(
        "POST {API_PATH_PREFIX}/users HTTP/1.1\r\nHost: {address}\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n",
        BODY.len()
    );
    let next = format!("GET {API_PATH_PREFIX}/health HTTP/1.1\r\nHost: {address}\r\n\r\n");
    let statuses = exchange(&mut connection, &head, &next).await;
    assert_eq!(statuses.ok(), Some((401, 200)));
}

/// Sends the head of an unauthorized request, then its body after the server has had time to answer it,
/// then the next request on the same connection; the statuses of both responses.
async fn exchange(
    connection: &mut TcpStream,
    head: &str,
    next: &str,
) -> std::io::Result<(u16, u16)> {
    connection.write_all(head.as_bytes()).await?;
    tokio::time::sleep(Duration::from_millis(200)).await;
    connection.write_all(BODY.as_bytes()).await?;
    let rejected = read_status(connection).await?;
    connection.write_all(next.as_bytes()).await?;
    Ok((rejected, read_status(connection).await?))
}

/// Reads one response with a `Content-Length` header and returns its status.
async fn read_status(connection: &mut TcpStream) -> std::io::Result<u16> {
    let mut head = Vec::new();
    while !head.ends_with(b"\r\n\r\n") {
        head.push(connection.read_u8().await?);
    }
    let head = String::from_utf8_lossy(&head).to_ascii_lowercase();
    let length = header_value(&head, "content-length").unwrap_or(0);
    connection.read_exact(&mut vec![0; length]).await?;
    Ok(head[9..12].parse().unwrap())
}

fn header_value(head: &str, name: &str) -> Option<usize> {
    head.lines()
        .find_map(|line| line.strip_prefix(&format!("{name}:")))
        .and_then(|value| value.trim().parse().ok())
}
