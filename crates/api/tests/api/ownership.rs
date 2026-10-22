//! Every account sees only its own data, and so does the holder of the launch token.

use serde_json::{Value, json};

use crate::support::{TestResponse, TestServer, read_fixture, spawn_test_server_with_accounts};

/// The requests of one principal, which present its token.
struct Client<'a> {
    server: &'a TestServer,
    token: String,
}

impl Client<'_> {
    async fn send(&self, method: &'static str, path: &str, body: Option<&Value>) -> TestResponse {
        let request = self.server.request(method, path).with_token(&self.token);
        match body {
            Some(body) => request.json(body).send().await,
            None => request.send().await,
        }
    }

    async fn get(&self, path: &str) -> TestResponse {
        self.send("GET", path, None).await
    }

    async fn post(&self, path: &str, body: &Value) -> TestResponse {
        self.send("POST", path, Some(body)).await
    }

    async fn put(&self, path: &str, body: &Value) -> TestResponse {
        self.send("PUT", path, Some(body)).await
    }

    async fn delete(&self, path: &str) -> TestResponse {
        self.send("DELETE", path, None).await
    }

    /// Posts and returns the `id` of the created row.
    async fn create(&self, path: &str, body: &Value) -> String {
        let response = self.post(path, body).await;
        assert!(response.status < 300, "{}", response.text());
        response.json()["id"].as_str().unwrap().to_string()
    }
}

/// The holder of the launch token.
fn launch(server: &TestServer) -> Client<'_> {
    Client {
        server,
        token: server.token.clone(),
    }
}

async fn sign_up<'a>(server: &'a TestServer, email: &str) -> Client<'a> {
    let body = json!({ "email": email, "password": "correct horse" });
    let response = server
        .request("POST", "/auth/signup")
        .without_token()
        .json(&body)
        .send()
        .await;
    let token = response.json()["token"].as_str().unwrap().to_string();
    Client { server, token }
}

/// A server with two accounts besides the launch token.
async fn two_accounts(server: &TestServer) -> (Client<'_>, Client<'_>) {
    let first = sign_up(server, "first@example.com").await;
    let second = sign_up(server, "second@example.com").await;
    (first, second)
}

fn settings(name: &str) -> Value {
    json!({
        "name": name,
        "target_language": "de",
        "translation_language": "en",
        "flashcard_fields": ["word"],
        "default_tags": [],
        "tags_media_name": false,
        "fills_audio_with_tts": false,
        "flashcard_front_fields": ["word"],
        "lists_anki_deletions": true,
    })
}

async fn create_project(client: &Client<'_>) -> String {
    client.create("/projects", &settings("Deutsch")).await
}

async fn add_media(client: &Client<'_>, project: &str) -> String {
    let body = json!({
        "name": "clip.webm",
        "source": { "kind": "browser_file", "size": 1, "last_modified_ms": 2 },
    });
    client
        .create(&format!("/projects/{project}/media"), &body)
        .await
}

async fn add_track(client: &Client<'_>, project: &str, media: &str) -> String {
    let body = json!({
        "name": "sample.srt",
        "source": { "kind": "inline", "text": String::from_utf8(read_fixture("sample.srt")).unwrap() },
        "format": null,
        "role": null,
    });
    client
        .create(
            &format!("/projects/{project}/media/{media}/subtitles"),
            &body,
        )
        .await
}

async fn add_alignment(client: &Client<'_>, project: &str, book: &str, audio: &str) -> String {
    let span = json!({ "chapter_index": 0, "paragraph_index": 1, "start": 0, "end": 12 });
    let body = json!({
        "provider": "cloud",
        "content": {
            "kind": "audio",
            "audio_media_file_id": audio,
            "segments": [{ "span": span, "start_ms": 0, "end_ms": 1500 }],
        },
    });
    client
        .create(
            &format!("/projects/{project}/media/{book}/alignments"),
            &body,
        )
        .await
}

fn new_flashcard(word: &str) -> Value {
    json!({
        "id": hex::encode(rand::random::<[u8; 16]>()),
        "draft": draft(word),
    })
}

fn draft(word: &str) -> Value {
    json!({
        "media_file_id": null,
        "cue_index": 0,
        "word_start": 0,
        "content": {
            "word": word,
            "word_pronunciation": "",
            "l1_definition": "",
            "l2_definition": "",
            "text_context": "",
            "text_context_translation": "",
            "text_context_pronunciation": "",
            "audio_context": null,
            "screenshot": null,
            "tags": [],
        },
        "included_fields": ["word"],
    })
}

async fn add_flashcard(client: &Client<'_>, project: &str) -> String {
    client
        .create(
            &format!("/projects/{project}/flashcards"),
            &new_flashcard("Haus"),
        )
        .await
}

/// Answers the flashcard and returns the id of the answer.
async fn answer(client: &Client<'_>, project: &str, flashcard: &str) -> String {
    let body = json!({
        "flashcard_id": flashcard,
        "rating": "good",
        "utc_offset_min": 0,
        "duration_ms": 1000,
    });
    let response = client
        .post(&format!("/projects/{project}/review/answers"), &body)
        .await;
    assert_eq!(response.status, 200, "{}", response.text());
    response.json()["entry"]["id"].as_str().unwrap().to_string()
}

async fn delete_flashcard(client: &Client<'_>, project: &str, flashcard: &str) {
    let response = client
        .delete(&format!("/projects/{project}/flashcards/{flashcard}"))
        .await;
    assert_eq!(response.status, 204, "{}", response.text());
}

/// Starts importing the fixture dictionary and returns the id of the job.
async fn start_import(client: &Client<'_>) -> String {
    let response = client
        .server
        .request("POST", "/dictionaries?fileName=sample-yomitan.zip")
        .with_token(&client.token)
        .header("Content-Type", "application/octet-stream")
        .body(read_fixture("sample-yomitan.zip"))
        .send()
        .await;
    response.json()["id"].as_str().unwrap().to_string()
}

/// Imports the fixture dictionary and returns its id.
async fn import_dictionary(client: &Client<'_>) -> String {
    let job = start_import(client).await;
    loop {
        let status = client
            .get(&format!("/dictionaries/imports/{job}"))
            .await
            .json();
        if status["state"] != "running" {
            return status["dictionary"]["id"].as_str().unwrap().to_string();
        }
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
    }
}

fn names_of_projects(response: &TestResponse) -> Vec<String> {
    response.json()["projects"]
        .as_array()
        .unwrap()
        .iter()
        .map(|project| project["id"].as_str().unwrap().to_string())
        .collect()
}

#[tokio::test(flavor = "multi_thread")]
async fn a_second_account_gets_not_found_for_the_first_accounts_project() {
    let server = spawn_test_server_with_accounts(true).await;
    let (first, second) = two_accounts(&server).await;
    let project = create_project(&first).await;
    let response = second.get(&format!("/projects/{project}")).await;
    assert_eq!(response.status, 404);
}

mod projects {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn a_new_account_lists_none_of_the_launch_principals_projects() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, _) = two_accounts(&server).await;
        let response = first.get("/projects").await;
        assert_eq!(names_of_projects(&response), Vec::<String>::new());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_launch_principal_does_not_list_an_accounts_project() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, _) = two_accounts(&server).await;
        let project = create_project(&first).await;
        let response = launch(&server).get("/projects").await;
        assert!(!names_of_projects(&response).contains(&project));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_account_lists_its_own_project() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, _) = two_accounts(&server).await;
        let project = create_project(&first).await;
        let response = first.get("/projects").await;
        assert_eq!(names_of_projects(&response), vec![project]);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_account_gets_not_found_for_a_project_of_the_launch_principal() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, _) = two_accounts(&server).await;
        let response = first.get("/projects/placeholder-1").await;
        assert_eq!(response.status, 404);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_cannot_change_the_first_accounts_project() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        let project = create_project(&first).await;
        let response = second
            .put(&format!("/projects/{project}"), &settings("Taken"))
            .await;
        assert_eq!(response.status, 404);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_cannot_delete_the_first_accounts_project() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        let project = create_project(&first).await;
        second.delete(&format!("/projects/{project}")).await;
        let response = first.get(&format!("/projects/{project}")).await;
        assert_eq!(response.status, 200);
    }
}

mod media {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_gets_not_found_for_the_first_accounts_media_list() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        let project = create_project(&first).await;
        let response = second.get(&format!("/projects/{project}/media")).await;
        assert_eq!(response.status, 404);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_cannot_reach_a_foreign_media_file_through_its_own_project() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        let media = add_media(&first, &create_project(&first).await).await;
        let own_project = create_project(&second).await;
        let response = second
            .delete(&format!("/projects/{own_project}/media/{media}"))
            .await;
        assert_eq!(response.status, 404);
    }
}

mod subtitles {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_cannot_read_the_cues_of_a_foreign_track() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        let project = create_project(&first).await;
        let media = add_media(&first, &project).await;
        let track = add_track(&first, &project, &media).await;
        let own_project = create_project(&second).await;
        let own_media = add_media(&second, &own_project).await;
        let response = second
            .get(&format!(
                "/projects/{own_project}/media/{own_media}/subtitles/{track}/cues"
            ))
            .await;
        assert_eq!(response.status, 404);
    }
}

mod alignments {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_cannot_remove_a_foreign_alignment() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        let project = create_project(&first).await;
        let book = add_media(&first, &project).await;
        let audio = add_media(&first, &project).await;
        let alignment = add_alignment(&first, &project, &book, &audio).await;
        let own_project = create_project(&second).await;
        let own_media = add_media(&second, &own_project).await;
        let response = second
            .delete(&format!(
                "/projects/{own_project}/media/{own_media}/alignments/{alignment}"
            ))
            .await;
        assert_eq!(response.status, 404);
    }
}

mod flashcards {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_gets_not_found_for_the_first_accounts_flashcards() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        let project = create_project(&first).await;
        let response = second.get(&format!("/projects/{project}/flashcards")).await;
        assert_eq!(response.status, 404);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_cannot_change_a_foreign_flashcard_through_its_own_project() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        let flashcard = add_flashcard(&first, &create_project(&first).await).await;
        let own_project = create_project(&second).await;
        let response = second
            .put(
                &format!("/projects/{own_project}/flashcards/{flashcard}"),
                &draft("Maus"),
            )
            .await;
        assert_eq!(response.status, 404);
    }
}

mod review {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_cannot_undo_a_foreign_answer() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        let project = create_project(&first).await;
        let flashcard = add_flashcard(&first, &project).await;
        let answer_id = answer(&first, &project, &flashcard).await;
        let own_project = create_project(&second).await;
        let response = second
            .delete(&format!(
                "/projects/{own_project}/review/answers/{answer_id}?utc_offset_min=0"
            ))
            .await;
        assert_eq!(response.status, 404);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_cannot_hold_a_foreign_flashcard() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        let flashcard = add_flashcard(&first, &create_project(&first).await).await;
        let own_project = create_project(&second).await;
        let response = second
            .put(
                &format!("/projects/{own_project}/review/holds/{flashcard}"),
                &json!({ "kind": "suspended", "utc_offset_min": 0 }),
            )
            .await;
        assert_eq!(response.status, 404);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_review_counts_of_an_account_leave_out_the_launch_principals_projects() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, _) = two_accounts(&server).await;
        let response = first.get("/review/counts?utc_offset_min=0").await;
        assert_eq!(response.json()["projects"], json!([]));
    }
}

mod anki {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_gets_not_found_for_the_first_accounts_pending_deletions() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        let project = create_project(&first).await;
        let response = second
            .get(&format!("/projects/{project}/anki/pending-deletions"))
            .await;
        assert_eq!(response.status, 404);
    }

    /// The flashcard of a pending deletion is already gone, so the path's flashcard id names no flashcard.
    #[tokio::test(flavor = "multi_thread")]
    async fn an_account_clears_a_pending_deletion_of_its_own_project() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, _) = two_accounts(&server).await;
        let project = create_project(&first).await;
        let flashcard = add_flashcard(&first, &project).await;
        delete_flashcard(&first, &project, &flashcard).await;
        let response = first
            .delete(&format!(
                "/projects/{project}/anki/pending-deletions/{flashcard}"
            ))
            .await;
        assert_eq!(response.status, 204);
    }
}

mod dictionaries {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_lists_none_of_the_first_accounts_dictionaries() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        import_dictionary(&first).await;
        let response = second.get("/dictionaries").await;
        assert_eq!(response.json()["dictionaries"], json!([]));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_launch_principal_lists_none_of_an_accounts_dictionaries() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, _) = two_accounts(&server).await;
        import_dictionary(&first).await;
        let response = launch(&server).get("/dictionaries").await;
        assert_eq!(response.json()["dictionaries"], json!([]));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_cannot_delete_the_first_accounts_dictionary() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        let dictionary = import_dictionary(&first).await;
        let response = second.delete(&format!("/dictionaries/{dictionary}")).await;
        assert_eq!(response.status, 404);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_gets_not_found_for_the_first_accounts_import_job() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        let job = start_import(&first).await;
        let response = second.get(&format!("/dictionaries/imports/{job}")).await;
        assert_eq!(response.status, 404);
    }
}

mod dictionary_media {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_gets_not_found_for_the_first_accounts_dictionary_media() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        let dictionary = import_dictionary(&first).await;
        let response = second
            .get(&format!(
                "/dictionaries/{dictionary}/media/images%2Fcat.png"
            ))
            .await;
        assert_eq!(response.status, 404);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_account_reads_the_media_of_its_own_dictionary() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, _) = two_accounts(&server).await;
        let dictionary = import_dictionary(&first).await;
        let response = first
            .get(&format!(
                "/dictionaries/{dictionary}/media/images%2Fcat.png"
            ))
            .await;
        assert_eq!(response.status, 200);
    }
}

mod preferences {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_account_does_not_see_the_first_accounts_preference() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, second) = two_accounts(&server).await;
        first
            .put("/preferences/showTranslations", &json!({ "value": "true" }))
            .await;
        let response = second.get("/preferences/showTranslations").await;
        assert_eq!(response.json(), json!({ "value": null }));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_launch_principal_does_not_see_an_accounts_preference() {
        let server = spawn_test_server_with_accounts(true).await;
        let (first, _) = two_accounts(&server).await;
        first
            .put("/preferences/showTranslations", &json!({ "value": "true" }))
            .await;
        let response = launch(&server).get("/preferences/showTranslations").await;
        assert_eq!(response.json(), json!({ "value": null }));
    }
}
