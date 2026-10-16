//! Exporting flashcards to Anki, and the audio clip route the export and the AnkiConnect client use.
//! Tests that render media skip when ffmpeg and ffprobe are not found.

use std::io::{Cursor, Read, Write};

use easyimmerse_media::TrackKind;
use easyimmerse_media_ffmpeg::{FfmpegPaths, probe_file};
use rusqlite::Connection;
use serde_json::{Value, json};
use tempfile::NamedTempFile;
use zip::ZipArchive;

use crate::support::{TestServer, ffmpeg_available, fixture_path, spawn_test_server};

const PROJECT: &str = "placeholder-1";

/// A fresh id of the form the app makes.
fn new_id() -> String {
    hex::encode(rand::random::<[u8; 16]>())
}

fn new_flashcard(id: &str, word: &str, media_file_id: Option<&str>) -> Value {
    json!({
        "id": id,
        "draft": {
            "media_file_id": media_file_id,
            "cue_index": null,
            "word_start": null,
            "content": {
                "word": word,
                "word_pronunciation": "",
                "l1_definition": "to eat",
                "l2_definition": "",
                "text_context": "Quiero comer.",
                "text_context_translation": "I want to eat.",
                "text_context_pronunciation": "",
                "audio_context": { "start_ms": 1000, "end_ms": 2500 },
                "screenshot": { "at_ms": 1800 },
                "tags": [],
            },
            "included_fields": ["word", "l1_definition", "text_context", "audio_context", "screenshot"],
        },
    })
}

async fn create_flashcard(
    server: &TestServer,
    project: &str,
    media_file_id: Option<&str>,
) -> String {
    let id = new_id();
    let response = server
        .post_json(
            &format!("/projects/{project}/flashcards"),
            &new_flashcard(&id, "comer", media_file_id),
        )
        .await;
    assert_eq!(response.status, 201, "{}", response.text());
    id
}

async fn create_two(server: &TestServer) -> Vec<String> {
    vec![
        create_flashcard(server, PROJECT, None).await,
        create_flashcard(server, PROJECT, None).await,
    ]
}

async fn delete_flashcard(server: &TestServer, id: &str) {
    let response = server
        .delete(&format!("/projects/{PROJECT}/flashcards/{id}"))
        .await;
    assert_eq!(response.status, 204, "{}", response.text());
}

async fn add_media(server: &TestServer, source: Value) -> String {
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/media"),
            &json!({ "name": "sample.mp4", "source": source }),
        )
        .await;
    assert_eq!(response.status, 201, "{}", response.text());
    response.json()["id"].as_str().unwrap().to_owned()
}

async fn add_sample_media(server: &TestServer) -> String {
    add_media(
        server,
        json!({ "kind": "path", "path": fixture_path("sample.mp4") }),
    )
    .await
}

async fn add_browser_media(server: &TestServer) -> String {
    add_media(
        server,
        json!({ "kind": "browser_file", "size": 1, "last_modified_ms": 2 }),
    )
    .await
}

async fn export(server: &TestServer, body: &Value) -> crate::support::TestResponse {
    server
        .post_json(&format!("/projects/{PROJECT}/anki/package"), body)
        .await
}

async fn export_ids(server: &TestServer, ids: &[String]) -> crate::support::TestResponse {
    export(
        server,
        &json!({ "flashcard_ids": ids, "marks_exported": true, "save_path": null }),
    )
    .await
}

async fn list_flashcards(server: &TestServer) -> Vec<Value> {
    let response = server.get(&format!("/projects/{PROJECT}/flashcards")).await;
    response.json()["flashcards"].as_array().unwrap().clone()
}

async fn set_anki_connect(
    server: &TestServer,
    project: &str,
    uses_anki_connect: bool,
) -> crate::support::TestResponse {
    server
        .put_json(
            &format!("/projects/{project}/anki-connect"),
            &json!({ "uses_anki_connect": uses_anki_connect }),
        )
        .await
}

async fn project(server: &TestServer) -> Value {
    server.get(&format!("/projects/{PROJECT}")).await.json()
}

fn read_entry(package: &[u8], name: &str) -> Vec<u8> {
    let mut archive = ZipArchive::new(Cursor::new(package)).unwrap();
    let mut bytes = Vec::new();
    archive
        .by_name(name)
        .unwrap()
        .read_to_end(&mut bytes)
        .unwrap();
    bytes
}

fn open_collection(package: &[u8]) -> Connection {
    let mut file = NamedTempFile::new().unwrap();
    file.write_all(&read_entry(package, "collection.anki2"))
        .unwrap();
    Connection::open(file.path()).unwrap()
}

fn count_notes(package: &[u8]) -> i64 {
    open_collection(package)
        .query_row("SELECT count(*) FROM notes", [], |row| row.get(0))
        .unwrap()
}

/// The field values of the package's single note, as Anki stores them: joined by the unit separator.
fn note_fields(package: &[u8]) -> Vec<String> {
    let joined: String = open_collection(package)
        .query_row("SELECT flds FROM notes", [], |row| row.get(0))
        .unwrap();
    joined.split('\x1f').map(str::to_owned).collect()
}

fn media_map(package: &[u8]) -> Value {
    serde_json::from_slice(&read_entry(package, "media")).unwrap()
}

mod export_anki_package {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn returns_a_package_holding_a_note_per_flashcard() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        let response = export_ids(&server, &ids).await;
        assert_eq!(count_notes(&response.bytes), 2);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn names_the_package_after_the_project() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        let response = export_ids(&server, &ids).await;
        assert_eq!(
            response.header("content-disposition"),
            Some(
                "attachment; filename=\"Spanish practice.apkg\"; filename*=UTF-8''Spanish%20practice%2Eapkg"
            )
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn sends_the_package_as_bytes() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        let response = export_ids(&server, &ids).await;
        assert_eq!(
            response.header("content-type"),
            Some("application/octet-stream")
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn marks_the_flashcards_exported() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        export_ids(&server, &ids).await;
        let flashcards = list_flashcards(&server).await;
        assert!(
            flashcards
                .iter()
                .all(|card| card["exported_at_ms"].is_u64())
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn dates_the_notes_no_earlier_than_the_recorded_export() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        let response = export_ids(&server, &ids).await;
        let exported_at_ms = list_flashcards(&server).await[0]["exported_at_ms"]
            .as_u64()
            .unwrap();
        let modified_secs: i64 = open_collection(&response.bytes)
            .query_row("SELECT mod FROM notes LIMIT 1", [], |row| row.get(0))
            .unwrap();
        assert!(modified_secs >= (exported_at_ms / 1000) as i64);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_edit_after_the_export_counts_as_a_change() {
        let server = spawn_test_server(false).await;
        let id = create_flashcard(&server, PROJECT, None).await;
        export_ids(&server, std::slice::from_ref(&id)).await;
        // The edit must land in a later millisecond than the export for the comparison to tell them apart.
        tokio::time::sleep(std::time::Duration::from_millis(2)).await;
        let draft = &new_flashcard(&id, "beber", None)["draft"];
        let response = server
            .put_json(&format!("/projects/{PROJECT}/flashcards/{id}"), draft)
            .await;
        assert_eq!(response.status, 200, "{}", response.text());
        let card = &list_flashcards(&server).await[0];
        assert!(card["updated_at_ms"].as_u64() > card["exported_at_ms"].as_u64());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn records_that_a_package_held_the_flashcards() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        export_ids(&server, &ids).await;
        assert_eq!(list_flashcards(&server).await[0]["was_packaged"], true);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn marks_nothing_exported_when_not_asked_to() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        let body = json!({ "flashcard_ids": ids, "marks_exported": false, "save_path": null });
        export(&server, &body).await;
        assert!(list_flashcards(&server).await[0]["exported_at_ms"].is_null());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn records_that_a_package_held_the_flashcards_when_not_marking_them() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        let body = json!({ "flashcard_ids": ids, "marks_exported": false, "save_path": null });
        export(&server, &body).await;
        assert_eq!(list_flashcards(&server).await[0]["was_packaged"], true);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn leaves_anki_connect_on() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        set_anki_connect(&server, PROJECT, true).await;
        export_ids(&server, &ids).await;
        assert_eq!(project(&server).await["uses_anki_connect"], true);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn does_not_mark_flashcards_that_were_not_named() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        export_ids(&server, &ids[..1]).await;
        let flashcards = list_flashcards(&server).await;
        let unmarked = flashcards
            .iter()
            .find(|card| card["id"] == ids[1].as_str())
            .unwrap();
        assert!(unmarked["exported_at_ms"].is_null());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_flashcard_of_another_project() {
        let server = spawn_test_server(false).await;
        let other = create_flashcard(&server, "placeholder-2", None).await;
        let response = export_ids(&server, &[other]).await;
        assert_eq!(response.status, 404);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn leaves_out_a_named_flashcard_that_is_gone() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        delete_flashcard(&server, &ids[1]).await;
        let response = export_ids(&server, &ids).await;
        assert_eq!(count_notes(&response.bytes), 1);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn counts_in_a_header_only_the_flashcards_packaged() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        delete_flashcard(&server, &ids[1]).await;
        let response = export_ids(&server, &ids).await;
        assert_eq!(response.header("x-easyimmerse-flashcard-count"), Some("1"));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn drops_a_flashcard_named_twice() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        let response = export_ids(&server, &[ids[0].clone(), ids[0].clone(), ids[1].clone()]).await;
        assert_eq!(count_notes(&response.bytes), 2);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_save_path_that_cannot_be_written() {
        let server = spawn_test_server(true).await;
        let ids = create_two(&server).await;
        let dir = tempfile::tempdir().unwrap();
        let response = export(
            &server,
            &json!({ "flashcard_ids": ids, "marks_exported": true, "save_path": dir.path() }),
        )
        .await;
        assert_eq!(response.json()["code"], "save_failed");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn marks_nothing_exported_when_the_save_fails() {
        let server = spawn_test_server(true).await;
        let ids = create_two(&server).await;
        let dir = tempfile::tempdir().unwrap();
        export(
            &server,
            &json!({ "flashcard_ids": ids, "marks_exported": true, "save_path": dir.path() }),
        )
        .await;
        let exported: Vec<Value> = list_flashcards(&server)
            .await
            .iter()
            .map(|card| card["exported_at_ms"].clone())
            .collect();
        assert_eq!(exported, [Value::Null, Value::Null]);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_an_empty_list() {
        let server = spawn_test_server(false).await;
        let response = export_ids(&server, &[]).await;
        assert_eq!(response.status, 400);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_save_path_without_local_path_rights() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        let path = "/nonexistent/refused.apkg";
        let response = export(
            &server,
            &json!({ "flashcard_ids": ids, "marks_exported": true, "save_path": path }),
        )
        .await;
        assert_eq!(response.status, 403);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_relative_save_path() {
        let server = spawn_test_server(true).await;
        let ids = create_two(&server).await;
        let response = export(
            &server,
            &json!({ "flashcard_ids": ids, "marks_exported": true, "save_path": "deck.apkg" }),
        )
        .await;
        assert_eq!(response.status, 400);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn writes_the_package_to_the_save_path() {
        let server = spawn_test_server(true).await;
        let ids = create_two(&server).await;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("deck.apkg");
        export(
            &server,
            &json!({ "flashcard_ids": ids, "marks_exported": true, "save_path": path }),
        )
        .await;
        assert_eq!(count_notes(&std::fs::read(&path).unwrap()), 2);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn answers_what_was_saved() {
        let server = spawn_test_server(true).await;
        let ids = create_two(&server).await;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("deck.apkg");
        let response = export(
            &server,
            &json!({ "flashcard_ids": ids, "marks_exported": true, "save_path": path }),
        )
        .await;
        assert_eq!(
            response.json(),
            json!({ "flashcard_count": 2, "skipped_media_count": 0 })
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn counts_the_media_of_a_browser_held_file_as_skipped() {
        let server = spawn_test_server(false).await;
        let media_id = add_browser_media(&server).await;
        let id = create_flashcard(&server, PROJECT, Some(&media_id)).await;
        let response = export_ids(&server, &[id]).await;
        assert_eq!(response.header("x-easyimmerse-skipped-media"), Some("2"));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn still_exports_a_flashcard_whose_media_was_skipped() {
        let server = spawn_test_server(false).await;
        let media_id = add_browser_media(&server).await;
        let id = create_flashcard(&server, PROJECT, Some(&media_id)).await;
        let response = export_ids(&server, &[id]).await;
        assert_eq!(count_notes(&response.bytes), 1);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn names_no_skipped_media_in_the_note() {
        let server = spawn_test_server(false).await;
        let media_id = add_browser_media(&server).await;
        let id = create_flashcard(&server, PROJECT, Some(&media_id)).await;
        let response = export_ids(&server, &[id]).await;
        let fields = note_fields(&response.bytes);
        assert_eq!((&fields[7], &fields[8]), (&String::new(), &String::new()));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn puts_the_clip_and_the_screenshot_in_the_package() {
        if !ffmpeg_available() {
            return;
        }
        let server = spawn_test_server(true).await;
        let media_id = add_sample_media(&server).await;
        let id = create_flashcard(&server, PROJECT, Some(&media_id)).await;
        let response = export_ids(&server, std::slice::from_ref(&id)).await;
        assert_eq!(
            media_map(&response.bytes),
            json!({ "0": format!("{id}.m4a"), "1": format!("{id}.jpg") })
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn skips_no_media_of_a_readable_file() {
        if !ffmpeg_available() {
            return;
        }
        let server = spawn_test_server(true).await;
        let media_id = add_sample_media(&server).await;
        let id = create_flashcard(&server, PROJECT, Some(&media_id)).await;
        let response = export_ids(&server, &[id]).await;
        assert_eq!(response.header("x-easyimmerse-skipped-media"), Some("0"));
    }
}

mod render_anki_notes {
    use super::*;

    async fn render(server: &TestServer, ids: &[String]) -> crate::support::TestResponse {
        server
            .post_json(
                &format!("/projects/{PROJECT}/anki/notes"),
                &json!({ "flashcard_ids": ids }),
            )
            .await
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn returns_the_note_type_of_the_project() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        let response = render(&server, &ids).await;
        assert_eq!(
            response.json()["note_type"]["name"],
            "easyImmerse: Spanish practice"
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn returns_a_note_per_flashcard_in_the_order_named() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        let reversed = vec![ids[1].clone(), ids[0].clone()];
        let response = render(&server, &reversed).await;
        let flashcard_ids: Vec<Value> = response.json()["notes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|note| note["flashcard_id"].clone())
            .collect();
        assert_eq!(flashcard_ids, json!(reversed).as_array().unwrap().clone());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_an_empty_list() {
        let server = spawn_test_server(false).await;
        let response = render(&server, &[]).await;
        assert_eq!(response.status, 400);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn names_the_deck_after_the_project() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        let response = render(&server, &ids).await;
        assert_eq!(response.json()["deck_name"], "Spanish practice");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn passes_over_a_flashcard_of_another_project() {
        let server = spawn_test_server(false).await;
        let other = create_flashcard(&server, "placeholder-2", None).await;
        let response = render(&server, &[other]).await;
        assert_eq!(response.json()["notes"], json!([]));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn renders_the_other_notes_when_a_named_flashcard_is_gone() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        delete_flashcard(&server, &ids[1]).await;
        let response = render(&server, &ids).await;
        let flashcard_ids: Vec<Value> = response.json()["notes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|note| note["flashcard_id"].clone())
            .collect();
        assert_eq!(flashcard_ids, [json!(ids[0])]);
    }
}

mod package_deletions {
    use super::*;

    /// Creates a flashcard, exports it marked as exported, and deletes it, returning its id.
    async fn delete_exported(server: &TestServer) -> String {
        let id = create_flashcard(server, PROJECT, None).await;
        export_ids(server, std::slice::from_ref(&id)).await;
        delete_flashcard(server, &id).await;
        id
    }

    async fn listed_count(server: &TestServer) -> usize {
        let response = server
            .get(&format!("/projects/{PROJECT}/anki/pending-deletions"))
            .await;
        response.json()["deletions"].as_array().unwrap().len()
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_package_holds_no_note_for_a_deleted_flashcard() {
        let server = spawn_test_server(false).await;
        delete_exported(&server).await;
        let kept = create_flashcard(&server, PROJECT, None).await;
        let response = export_ids(&server, &[kept]).await;
        let note_count: i64 = open_collection(&response.bytes)
            .query_row("SELECT count(*) FROM notes", [], |row| row.get(0))
            .unwrap();
        assert_eq!(note_count, 1);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn keeps_the_deletion_listed_once_a_package_is_delivered() {
        let server = spawn_test_server(false).await;
        delete_exported(&server).await;
        let kept = create_flashcard(&server, PROJECT, None).await;
        export_ids(&server, &[kept]).await;
        assert_eq!(listed_count(&server).await, 1);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_package_naming_no_flashcard_while_a_deletion_is_listed() {
        let server = spawn_test_server(false).await;
        delete_exported(&server).await;
        let body = json!({ "flashcard_ids": [], "marks_exported": true, "save_path": null });
        assert_eq!(export(&server, &body).await.status, 400);
    }
}

mod record_anki_send {
    use super::*;

    async fn record(
        server: &TestServer,
        ids: &[&str],
        rendered_at_ms: u64,
    ) -> crate::support::TestResponse {
        server
            .post_json(
                &format!("/projects/{PROJECT}/anki/sent"),
                &json!({ "flashcard_ids": ids, "rendered_at_ms": rendered_at_ms }),
            )
            .await
    }

    fn sent_at(flashcards: &[Value], id: &str) -> Value {
        flashcards.iter().find(|card| card["id"] == id).unwrap()["sent_at_ms"].clone()
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn marks_the_flashcards_sent_when_their_notes_were_rendered() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        record(&server, &[&ids[0]], 1_700).await;
        assert_eq!(sent_at(&list_flashcards(&server).await, &ids[0]), 1_700);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn marks_no_flashcard_that_was_not_named() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        record(&server, &[&ids[0]], 1_700).await;
        assert!(sent_at(&list_flashcards(&server).await, &ids[1]).is_null());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn leaves_anki_connect_off() {
        let server = spawn_test_server(false).await;
        record(&server, &[], 1).await;
        assert_eq!(project(&server).await["uses_anki_connect"], false);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn answers_no_content() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        assert_eq!(record(&server, &[&ids[0]], 1).await.status, 204);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn marks_no_flashcard_of_another_project_sent() {
        let server = spawn_test_server(false).await;
        let other = create_flashcard(&server, "placeholder-2", None).await;
        record(&server, &[&other], 1).await;
        let response = server.get("/projects/placeholder-2/flashcards").await;
        let flashcards = response.json()["flashcards"].as_array().unwrap().clone();
        assert!(sent_at(&flashcards, &other).is_null());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn records_the_other_flashcards_when_a_sent_flashcard_is_gone() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        delete_flashcard(&server, &ids[1]).await;
        record(&server, &[&ids[0], &ids[1]], 7).await;
        assert_eq!(sent_at(&list_flashcards(&server).await, &ids[0]), 7);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_edit_after_the_notes_were_rendered_counts_as_a_change() {
        let server = spawn_test_server(false).await;
        let id = create_flashcard(&server, PROJECT, None).await;
        let rendered = server
            .post_json(
                &format!("/projects/{PROJECT}/anki/notes"),
                &json!({ "flashcard_ids": [id] }),
            )
            .await
            .json()["rendered_at_ms"]
            .as_u64()
            .unwrap();
        // The edit must land in a later millisecond than the rendering for the comparison to tell them apart.
        tokio::time::sleep(std::time::Duration::from_millis(2)).await;
        let draft = &new_flashcard(&id, "beber", None)["draft"];
        server
            .put_json(&format!("/projects/{PROJECT}/flashcards/{id}"), draft)
            .await;
        record(&server, &[&id], rendered).await;
        let card = &list_flashcards(&server).await[0];
        assert!(card["updated_at_ms"].as_u64() > card["sent_at_ms"].as_u64());
    }
}

mod set_anki_connect {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn answers_the_project_with_anki_connect_on() {
        let server = spawn_test_server(false).await;
        let response = set_anki_connect(&server, PROJECT, true).await;
        assert_eq!(response.json()["uses_anki_connect"], true);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn turns_anki_connect_on() {
        let server = spawn_test_server(false).await;
        set_anki_connect(&server, PROJECT, true).await;
        assert_eq!(project(&server).await["uses_anki_connect"], true);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn turns_anki_connect_off() {
        let server = spawn_test_server(false).await;
        set_anki_connect(&server, PROJECT, true).await;
        set_anki_connect(&server, PROJECT, false).await;
        assert_eq!(project(&server).await["uses_anki_connect"], false);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_an_unknown_project() {
        let server = spawn_test_server(false).await;
        let response = set_anki_connect(&server, "missing", true).await;
        assert_eq!(response.status, 404);
    }
}

mod anki_pending_deletions {
    use super::*;

    async fn record_sent(server: &TestServer, id: &str) {
        let response = server
            .post_json(
                &format!("/projects/{PROJECT}/anki/sent"),
                &json!({ "flashcard_ids": [id], "rendered_at_ms": 7 }),
            )
            .await;
        assert_eq!(response.status, 204, "{}", response.text());
    }

    /// Creates a flashcard, sends it to Anki, turns AnkiConnect on or off and deletes the flashcard, returning its id.
    async fn delete_sent(server: &TestServer, uses_anki_connect: bool) -> String {
        let id = create_flashcard(server, PROJECT, None).await;
        record_sent(server, &id).await;
        set_anki_connect(server, PROJECT, uses_anki_connect).await;
        delete_flashcard(server, &id).await;
        id
    }

    async fn listed_ids(server: &TestServer) -> Vec<Value> {
        let response = server
            .get(&format!("/projects/{PROJECT}/anki/pending-deletions"))
            .await;
        response.json()["deletions"]
            .as_array()
            .unwrap()
            .iter()
            .map(|deletion| deletion["flashcard_id"].clone())
            .collect()
    }

    async fn clear(server: &TestServer, project: &str, id: &str) -> crate::support::TestResponse {
        server
            .delete(&format!("/projects/{project}/anki/pending-deletions/{id}"))
            .await
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn lists_a_flashcard_deleted_in_a_project_using_anki_connect() {
        let server = spawn_test_server(false).await;
        let id = delete_sent(&server, true).await;
        assert_eq!(listed_ids(&server).await, [json!(id)]);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn lists_nothing_for_a_flashcard_deleted_before_it_reached_anki() {
        let server = spawn_test_server(false).await;
        set_anki_connect(&server, PROJECT, true).await;
        let id = create_flashcard(&server, PROJECT, None).await;
        delete_flashcard(&server, &id).await;
        assert_eq!(listed_ids(&server).await, Vec::<Value>::new());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn lists_a_flashcard_whose_send_is_recorded_after_its_deletion() {
        let server = spawn_test_server(false).await;
        set_anki_connect(&server, PROJECT, true).await;
        let id = create_flashcard(&server, PROJECT, None).await;
        delete_flashcard(&server, &id).await;
        record_sent(&server, &id).await;
        assert_eq!(listed_ids(&server).await, [json!(id)]);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn names_the_deleted_flashcard_by_its_word() {
        let server = spawn_test_server(false).await;
        delete_sent(&server, true).await;
        let response = server
            .get(&format!("/projects/{PROJECT}/anki/pending-deletions"))
            .await;
        assert_eq!(response.json()["deletions"][0]["word"], "comer");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn lists_a_flashcard_deleted_while_anki_connect_is_off_in_a_project_listing_deletions() {
        let server = spawn_test_server(false).await;
        let id = delete_sent(&server, false).await;
        assert_eq!(listed_ids(&server).await, [json!(id)]);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn lists_nothing_while_neither_anki_connect_nor_the_listing_is_on() {
        let server = spawn_test_server(false).await;
        let mut settings = project(&server).await["settings"].clone();
        settings["lists_anki_deletions"] = json!(false);
        server
            .put_json(&format!("/projects/{PROJECT}"), &settings)
            .await;
        delete_sent(&server, false).await;
        assert_eq!(listed_ids(&server).await, Vec::<Value>::new());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn clearing_removes_the_deletion() {
        let server = spawn_test_server(false).await;
        let id = delete_sent(&server, true).await;
        clear(&server, PROJECT, &id).await;
        assert_eq!(listed_ids(&server).await, Vec::<Value>::new());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn clearing_answers_no_content() {
        let server = spawn_test_server(false).await;
        let id = delete_sent(&server, true).await;
        assert_eq!(clear(&server, PROJECT, &id).await.status, 204);
    }

    async fn mark_done(
        server: &TestServer,
        project: &str,
        ids: &[&str],
    ) -> crate::support::TestResponse {
        server
            .post_json(
                &format!("/projects/{project}/anki/pending-deletions/cleared"),
                &json!({ "flashcard_ids": ids }),
            )
            .await
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn marking_deletions_done_removes_them() {
        let server = spawn_test_server(false).await;
        let id = delete_sent(&server, true).await;
        mark_done(&server, PROJECT, &[&id]).await;
        assert_eq!(listed_ids(&server).await, Vec::<Value>::new());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn marking_deletions_done_keeps_the_ones_not_named() {
        let server = spawn_test_server(false).await;
        let first = delete_sent(&server, true).await;
        let second = delete_sent(&server, true).await;
        mark_done(&server, PROJECT, &[&first]).await;
        assert_eq!(listed_ids(&server).await, [json!(second)]);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn marking_deletions_done_answers_no_content() {
        let server = spawn_test_server(false).await;
        let id = delete_sent(&server, true).await;
        assert_eq!(mark_done(&server, PROJECT, &[&id]).await.status, 204);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn marking_deletions_done_in_an_unknown_project_is_not_found() {
        let server = spawn_test_server(false).await;
        assert_eq!(mark_done(&server, "missing", &[]).await.status, 404);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn clearing_in_an_unknown_project_is_not_found() {
        let server = spawn_test_server(false).await;
        assert_eq!(clear(&server, "missing", &new_id()).await.status, 404);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn listing_an_unknown_project_is_not_found() {
        let server = spawn_test_server(false).await;
        let response = server.get("/projects/missing/anki/pending-deletions").await;
        assert_eq!(response.status, 404);
    }
}

mod media_clip {
    use super::*;

    fn clip_path(media_id: &str, query: &str) -> String {
        format!("/projects/{PROJECT}/media/{media_id}/clip?{query}")
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_browser_held_file() {
        let server = spawn_test_server(false).await;
        let media_id = add_browser_media(&server).await;
        let response = server
            .get(&clip_path(&media_id, "start_ms=0&end_ms=1000"))
            .await;
        assert_eq!(response.json()["code"], "not_resolvable");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_clip_that_ends_before_it_starts() {
        let server = spawn_test_server(true).await;
        let media_id = add_sample_media(&server).await;
        let response = server
            .get(&clip_path(&media_id, "start_ms=2000&end_ms=1000"))
            .await;
        assert_eq!(response.status, 400);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn follows_the_saved_audio_track() {
        if !ffmpeg_available() {
            return;
        }
        let server = spawn_test_server(true).await;
        let media_id = add_sample_media(&server).await;
        server
            .put_json(
                &format!("/projects/{PROJECT}/media/{media_id}/track-selection"),
                &json!({ "video": null, "audio": 7 }),
            )
            .await;
        let response = server
            .get(&clip_path(&media_id, "start_ms=1000&end_ms=2500"))
            .await;
        assert_eq!(response.status, 404);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn is_audio_in_mp4() {
        if !ffmpeg_available() {
            return;
        }
        let server = spawn_test_server(true).await;
        let media_id = add_sample_media(&server).await;
        let response = server
            .get(&clip_path(&media_id, "start_ms=1000&end_ms=2500"))
            .await;
        assert_eq!(response.header("content-type"), Some("audio/mp4"));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn holds_one_aac_track_that_ffprobe_reads() {
        if !ffmpeg_available() {
            return;
        }
        let server = spawn_test_server(true).await;
        let media_id = add_sample_media(&server).await;
        let response = server
            .get(&clip_path(&media_id, "start_ms=1000&end_ms=2500"))
            .await;
        let mut file = NamedTempFile::with_suffix(".m4a").unwrap();
        file.write_all(&response.bytes).unwrap();
        let container = probe_file(file.path(), &FfmpegPaths::default()).unwrap();
        let tracks: Vec<(TrackKind, String)> = container
            .tracks
            .iter()
            .map(|track| (track.kind, track.codec.clone()))
            .collect();
        assert_eq!(tracks, [(TrackKind::Audio, "aac".to_owned())]);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn accepts_the_token_as_a_query_parameter() {
        if !ffmpeg_available() {
            return;
        }
        let server = spawn_test_server(true).await;
        let media_id = add_sample_media(&server).await;
        let response = server
            .request(
                "GET",
                &clip_path(
                    &media_id,
                    &format!("start_ms=0&end_ms=500&token={}", server.token),
                ),
            )
            .without_token()
            .send()
            .await;
        assert_eq!(response.status, 200);
    }
}
