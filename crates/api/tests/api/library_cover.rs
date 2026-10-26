//! The cover pictures of library items: uploaded pictures, the covers of EPUB files, frames of videos,
//! and going back to the automatic cover. The tests that render a frame skip when ffmpeg and ffprobe are not found.

use std::io::{Cursor, Write};

use serde_json::{Value, json};
use zip::ZipWriter;
use zip::write::SimpleFileOptions;

use crate::library::{create_item, document_item, library_server, published_video, upload};
use crate::stored_copies::sign_up;
use crate::support::{TestResponse, TestServer, ffmpeg_available, read_fixture};
use crate::sync::send_as;

const PNG: &[u8] = b"\x89PNG\r\n\x1a\n\0\0\0\rIHDR";
const JPEG: &[u8] = &[0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, b'J', b'F', b'I', b'F'];

/// An EPUB file of one paragraph whose package document marks a JPEG picture as its cover.
fn epub_with_cover() -> Vec<u8> {
    let files: [(&str, &[u8]); 5] = [
        ("mimetype", b"application/epub+zip"),
        (
            "META-INF/container.xml",
            br#"<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>"#,
        ),
        (
            "OEBPS/content.opf",
            br#"<package><metadata><title>Der Hund</title></metadata><manifest>
                <item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/>
                <item id="cover" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>
            </manifest><spine><itemref idref="c1"/></spine></package>"#,
        ),
        (
            "OEBPS/c1.xhtml",
            br#"<html xmlns="http://www.w3.org/1999/xhtml"><body><p>Der Hund bellt.</p></body></html>"#,
        ),
        ("OEBPS/cover.jpg", JPEG),
    ];
    let mut zip = ZipWriter::new(Cursor::new(Vec::new()));
    for (name, bytes) in files {
        zip.start_file(name, SimpleFileOptions::default()).unwrap();
        zip.write_all(bytes).unwrap();
    }
    zip.finish().unwrap().into_inner()
}

async fn upload_cover(server: &TestServer, item_id: &str, bytes: &[u8]) -> TestResponse {
    server
        .request("PUT", &format!("/library/items/{item_id}/cover"))
        .header("Content-Type", "application/octet-stream")
        .body(bytes.to_vec())
        .send()
        .await
}

async fn reset_cover(server: &TestServer, item_id: &str) -> Value {
    let response = server
        .delete(&format!("/library/items/{item_id}/cover"))
        .await;
    assert_eq!(response.status, 200, "{}", response.text());
    response.json()
}

async fn get_cover(server: &TestServer, item_id: &str) -> TestResponse {
    server.get(&format!("/library/items/{item_id}/cover")).await
}

/// A document item made from an EPUB file with a cover; its id.
async fn epub_item(server: &TestServer) -> String {
    let item_id = create_item(server, "document").await;
    let response = upload(server, &item_id, "hund.epub", epub_with_cover()).await;
    assert_eq!(response.status, 200, "{}", response.text());
    item_id
}

#[tokio::test(flavor = "multi_thread")]
async fn an_uploaded_cover_is_served_with_its_type() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    upload_cover(&server, &item_id, PNG).await;
    let response = get_cover(&server, &item_id).await;
    assert_eq!(response.header("content-type"), Some("image/png"));
}

#[tokio::test(flavor = "multi_thread")]
async fn uploading_a_cover_records_the_choice() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    let item = upload_cover(&server, &item_id, PNG).await.json();
    assert_eq!(
        (item["cover"].clone(), item["has_cover"].clone()),
        (json!({ "kind": "uploaded" }), json!(true))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_cover_that_is_not_a_picture_is_refused() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    let response = upload_cover(&server, &item_id, b"<svg/>").await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_learner_may_not_upload_a_cover() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    let token = sign_up(&server, "learner@example.com").await;
    let response = server
        .request("PUT", &format!("/library/items/{item_id}/cover"))
        .with_token(&token)
        .body(PNG.to_vec())
        .send()
        .await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_epub_files_cover_becomes_the_automatic_cover() {
    let (server, _dir) = library_server().await;
    let item_id = epub_item(&server).await;
    let response = get_cover(&server, &item_id).await;
    assert_eq!(response.header("content-type"), Some("image/jpeg"));
}

#[tokio::test(flavor = "multi_thread")]
async fn a_plain_text_file_gives_no_cover() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    assert_eq!(get_cover(&server, &item_id).await.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_new_file_keeps_an_uploaded_cover() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    upload_cover(&server, &item_id, PNG).await;
    upload(&server, &item_id, "hund.epub", epub_with_cover()).await;
    let response = get_cover(&server, &item_id).await;
    assert_eq!(response.header("content-type"), Some("image/png"));
}

#[tokio::test(flavor = "multi_thread")]
async fn going_back_to_the_automatic_cover_takes_the_epub_files_cover_again() {
    let (server, _dir) = library_server().await;
    let item_id = epub_item(&server).await;
    upload_cover(&server, &item_id, PNG).await;
    reset_cover(&server, &item_id).await;
    let response = get_cover(&server, &item_id).await;
    assert_eq!(response.header("content-type"), Some("image/jpeg"));
}

#[tokio::test(flavor = "multi_thread")]
async fn going_back_to_the_automatic_cover_of_a_plain_text_leaves_no_cover() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    upload_cover(&server, &item_id, PNG).await;
    let item = reset_cover(&server, &item_id).await;
    assert_eq!(item["has_cover"], json!(false));
}

#[tokio::test(flavor = "multi_thread")]
async fn a_documents_cover_cannot_be_a_frame() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    let path = format!("/library/items/{item_id}/cover/frame");
    let response = server.put_json(&path, &json!({ "at_ms": 0 })).await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_published_items_cover_can_change() {
    let (server, _dir) = library_server().await;
    let item_id = crate::library::published_document(&server).await;
    let response = upload_cover(&server, &item_id, PNG).await;
    assert_eq!(response.status, 200, "{}", response.text());
}

#[tokio::test(flavor = "multi_thread")]
async fn a_chosen_frame_of_a_draft_video_is_rendered_at_once() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _dir) = library_server().await;
    let item_id = create_item(&server, "video").await;
    upload(&server, &item_id, "sample.mp4", read_fixture("sample.mp4")).await;
    let path = format!("/library/items/{item_id}/cover/frame");
    let item = server
        .put_json(&path, &json!({ "at_ms": 1_000 }))
        .await
        .json();
    assert_eq!(
        (item["cover"].clone(), item["has_cover"].clone()),
        (json!({ "kind": "frame", "at_ms": 1_000 }), json!(true))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn publishing_a_video_keeps_its_uploaded_cover() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _dir) = library_server().await;
    let (item, (token, _, _)) = published_video(&server).await;
    let item_id = item["id"].as_str().unwrap();
    server
        .post_json(&format!("/library/items/{item_id}/unpublish"), &json!({}))
        .await;
    upload_cover(&server, item_id, PNG).await;
    crate::library::publish(&server, item_id).await;
    let path = format!("/library/items/{item_id}/cover");
    let response = send_as(&server, &token, "GET", &path, None).await;
    assert_eq!(response.header("content-type"), Some("image/png"));
}
