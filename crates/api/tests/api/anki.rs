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
    export(server, &json!({ "flashcard_ids": ids, "save_path": null })).await
}

async fn list_flashcards(server: &TestServer) -> Vec<Value> {
    let response = server.get(&format!("/projects/{PROJECT}/flashcards")).await;
    response.json()["flashcards"].as_array().unwrap().clone()
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
    async fn dates_the_notes_at_the_recorded_export() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        let response = export_ids(&server, &ids).await;
        let exported_at_ms = list_flashcards(&server).await[0]["exported_at_ms"]
            .as_u64()
            .unwrap();
        let modified_secs: i64 = open_collection(&response.bytes)
            .query_row("SELECT mod FROM notes LIMIT 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(modified_secs, (exported_at_ms / 1000) as i64);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn sets_the_destination_to_the_package() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        export_ids(&server, &ids).await;
        assert_eq!(
            project(&server).await["flashcard_destination"],
            "anki_package"
        );
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
            &json!({ "flashcard_ids": ids, "save_path": dir.path() }),
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
            &json!({ "flashcard_ids": ids, "save_path": dir.path() }),
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
        let response = export(&server, &json!({ "flashcard_ids": ids, "save_path": path })).await;
        assert_eq!(response.status, 403);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_relative_save_path() {
        let server = spawn_test_server(true).await;
        let ids = create_two(&server).await;
        let response = export(
            &server,
            &json!({ "flashcard_ids": ids, "save_path": "deck.apkg" }),
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
        export(&server, &json!({ "flashcard_ids": ids, "save_path": path })).await;
        assert_eq!(count_notes(&std::fs::read(&path).unwrap()), 2);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn answers_what_was_saved() {
        let server = spawn_test_server(true).await;
        let ids = create_two(&server).await;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("deck.apkg");
        let response = export(&server, &json!({ "flashcard_ids": ids, "save_path": path })).await;
        assert_eq!(
            response.json(),
            json!({ "flashcard_count": 2, "skipped_media_count": 0 })
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_saved_package_sets_the_destination() {
        let server = spawn_test_server(true).await;
        let ids = create_two(&server).await;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("deck.apkg");
        export(&server, &json!({ "flashcard_ids": ids, "save_path": path })).await;
        assert_eq!(
            project(&server).await["flashcard_destination"],
            "anki_package"
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
    async fn refuses_a_flashcard_of_another_project() {
        let server = spawn_test_server(false).await;
        let other = create_flashcard(&server, "placeholder-2", None).await;
        let response = render(&server, &[other]).await;
        assert_eq!(response.status, 404);
    }
}

mod record_anki_notes_sent {
    use super::*;

    async fn record(server: &TestServer, notes: Value) -> crate::support::TestResponse {
        server
            .post_json(
                &format!("/projects/{PROJECT}/anki/sent"),
                &json!({ "notes": notes }),
            )
            .await
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn stores_the_note_ids() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        record(
            &server,
            json!([
                { "flashcard_id": ids[0], "anki_note_id": 1_700_000_000_001u64 },
                { "flashcard_id": ids[1], "anki_note_id": 1_700_000_000_002u64 },
            ]),
        )
        .await;
        let mut note_ids: Vec<Value> = list_flashcards(&server)
            .await
            .iter()
            .map(|card| card["anki_note_id"].clone())
            .collect();
        note_ids.sort_by_key(|id| id.as_u64());
        assert_eq!(
            note_ids,
            [json!(1_700_000_000_001u64), json!(1_700_000_000_002u64)]
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_empty_list_sets_the_destination() {
        let server = spawn_test_server(false).await;
        record(&server, json!([])).await;
        assert_eq!(
            project(&server).await["flashcard_destination"],
            "anki_connect"
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_empty_list_gives_no_flashcard_a_note_id() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        record(&server, json!([])).await;
        let note_ids: Vec<Value> = list_flashcards(&server)
            .await
            .iter()
            .filter(|card| ids.contains(&card["id"].as_str().unwrap().to_owned()))
            .map(|card| card["anki_note_id"].clone())
            .collect();
        assert_eq!(note_ids, [Value::Null, Value::Null]);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn keeps_the_first_note_id_of_a_flashcard_named_twice() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        record(
            &server,
            json!([
                { "flashcard_id": ids[0], "anki_note_id": 100 },
                { "flashcard_id": ids[0], "anki_note_id": 200 },
            ]),
        )
        .await;
        let flashcards = list_flashcards(&server).await;
        let first = flashcards.iter().find(|card| card["id"] == ids[0]).unwrap();
        assert_eq!(first["anki_note_id"], 100);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn sets_the_destination_to_anki_connect() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        record(
            &server,
            json!([{ "flashcard_id": ids[0], "anki_note_id": 7 }]),
        )
        .await;
        assert_eq!(
            project(&server).await["flashcard_destination"],
            "anki_connect"
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn answers_no_content() {
        let server = spawn_test_server(false).await;
        let ids = create_two(&server).await;
        let response = record(
            &server,
            json!([{ "flashcard_id": ids[0], "anki_note_id": 7 }]),
        )
        .await;
        assert_eq!(response.status, 204);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_flashcard_of_another_project() {
        let server = spawn_test_server(false).await;
        let other = create_flashcard(&server, "placeholder-2", None).await;
        let response = record(
            &server,
            json!([{ "flashcard_id": other, "anki_note_id": 7 }]),
        )
        .await;
        assert_eq!(response.status, 404);
    }
}

mod set_flashcard_destination {
    use super::*;

    async fn set(server: &TestServer, destination: Value) -> crate::support::TestResponse {
        server
            .put_json(
                &format!("/projects/{PROJECT}/flashcard-destination"),
                &json!({ "destination": destination }),
            )
            .await
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn answers_the_project_with_the_destination() {
        let server = spawn_test_server(false).await;
        let response = set(&server, json!("anki_connect")).await;
        assert_eq!(response.json()["flashcard_destination"], "anki_connect");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn stores_the_destination() {
        let server = spawn_test_server(false).await;
        set(&server, json!("anki_package")).await;
        assert_eq!(
            project(&server).await["flashcard_destination"],
            "anki_package"
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn clears_the_destination() {
        let server = spawn_test_server(false).await;
        set(&server, json!("anki_package")).await;
        set(&server, Value::Null).await;
        assert_eq!(project(&server).await["flashcard_destination"], Value::Null);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_an_unknown_project() {
        let server = spawn_test_server(false).await;
        let response = server
            .put_json(
                "/projects/missing/flashcard-destination",
                &json!({ "destination": "anki_package" }),
            )
            .await;
        assert_eq!(response.status, 404);
    }
}

mod anki_pending_deletions {
    use super::*;

    async fn set_destination(server: &TestServer, destination: &str) {
        let response = server
            .put_json(
                &format!("/projects/{PROJECT}/flashcard-destination"),
                &json!({ "destination": destination }),
            )
            .await;
        assert_eq!(response.status, 200, "{}", response.text());
    }

    /// Creates a flashcard in a project with the given destination and deletes it, returning its id.
    async fn delete_in_project_sending_to(server: &TestServer, destination: &str) -> String {
        set_destination(server, destination).await;
        let id = create_flashcard(server, PROJECT, None).await;
        server
            .delete(&format!("/projects/{PROJECT}/flashcards/{id}"))
            .await;
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
    async fn lists_a_flashcard_deleted_in_a_project_sending_through_anki_connect() {
        let server = spawn_test_server(false).await;
        let id = delete_in_project_sending_to(&server, "anki_connect").await;
        assert_eq!(listed_ids(&server).await, [json!(id)]);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn names_the_deleted_flashcard_by_its_word() {
        let server = spawn_test_server(false).await;
        delete_in_project_sending_to(&server, "anki_connect").await;
        let response = server
            .get(&format!("/projects/{PROJECT}/anki/pending-deletions"))
            .await;
        assert_eq!(response.json()["deletions"][0]["word"], "comer");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn lists_nothing_for_a_project_exporting_packages() {
        let server = spawn_test_server(false).await;
        delete_in_project_sending_to(&server, "anki_package").await;
        assert_eq!(listed_ids(&server).await, Vec::<Value>::new());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn clearing_removes_the_deletion() {
        let server = spawn_test_server(false).await;
        let id = delete_in_project_sending_to(&server, "anki_connect").await;
        clear(&server, PROJECT, &id).await;
        assert_eq!(listed_ids(&server).await, Vec::<Value>::new());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn clearing_answers_no_content() {
        let server = spawn_test_server(false).await;
        let id = delete_in_project_sending_to(&server, "anki_connect").await;
        assert_eq!(clear(&server, PROJECT, &id).await.status, 204);
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
