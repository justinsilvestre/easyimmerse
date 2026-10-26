//! A server can serve the same API on further listeners, each of which stops on its own.

use std::net::{SocketAddr, TcpStream};

use easyimmerse_api::API_PATH_PREFIX;
use tokio::net::TcpListener;

use crate::support::{TestRequest, spawn_test_server};

async fn bind_loopback() -> TcpListener {
    TcpListener::bind("127.0.0.1:0")
        .await
        .expect("a free loopback port")
}

fn accepts_connections(addr: SocketAddr) -> bool {
    TcpStream::connect(addr).is_ok()
}

#[tokio::test(flavor = "multi_thread")]
async fn a_second_listener_answers_the_health_route() {
    let server = spawn_test_server(false).await;
    let listener = bind_loopback().await;
    let port = listener.local_addr().expect("a bound address").port();
    let _extra = server
        .handle
        .serve_also(listener)
        .expect("a second listener");
    // The server expects only the host of its first listener, so the request names that host.
    let first_host = server.base_url.trim_start_matches("http://").to_string();
    let response = TestRequest::to(
        "GET",
        format!("http://127.0.0.1:{port}{API_PATH_PREFIX}/health"),
    )
    .header("Host", &first_host)
    .send()
    .await;
    assert_eq!(response.status, 200);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_stopped_second_listener_accepts_no_connections() {
    let server = spawn_test_server(false).await;
    let extra = server
        .handle
        .serve_also(bind_loopback().await)
        .expect("a second listener");
    let extra_addr = extra.addr;
    extra.shutdown().await.expect("the listener to stop");
    assert!(!accepts_connections(extra_addr));
}

#[tokio::test(flavor = "multi_thread")]
async fn the_first_listener_keeps_running_after_a_second_one_stops() {
    let server = spawn_test_server(false).await;
    let extra = server
        .handle
        .serve_also(bind_loopback().await)
        .expect("a second listener");
    extra.shutdown().await.expect("the listener to stop");
    assert!(accepts_connections(server.handle.addr));
}

#[tokio::test(flavor = "multi_thread")]
async fn stopping_the_server_stops_a_second_listener() {
    let server = spawn_test_server(false).await;
    let extra = server
        .handle
        .serve_also(bind_loopback().await)
        .expect("a second listener");
    let extra_addr = extra.addr;
    server.handle.shutdown().await.expect("the server to stop");
    assert!(!accepts_connections(extra_addr));
}
