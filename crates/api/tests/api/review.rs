use serde_json::{Value, json};

use crate::support::{TestServer, spawn_test_server};

const PROJECT: &str = "placeholder-1";
const OFFSET: &str = "utc_offset_min=120";

async fn create_flashcard(server: &TestServer, project: &str, word: &str) -> String {
    let id = hex::encode(rand::random::<[u8; 16]>());
    let body = json!({
        "id": id,
        "draft": {
            "media_file_id": null,
            "cue_index": null,
            "word_start": null,
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
        },
    });
    let response = server
        .post_json(&format!("/projects/{project}/flashcards"), &body)
        .await;
    assert_eq!(response.status, 201, "{}", response.text());
    id
}

async fn queue(server: &TestServer) -> Value {
    let response = server
        .get(&format!("/projects/{PROJECT}/review/queue?{OFFSET}"))
        .await;
    assert_eq!(response.status, 200, "{}", response.text());
    response.json()
}

async fn answer(server: &TestServer, flashcard_id: &str, rating: &str) -> Value {
    let response = post_answer(server, flashcard_id, rating).await;
    assert_eq!(response.status, 200, "{}", response.text());
    response.json()
}

async fn post_answer(
    server: &TestServer,
    flashcard_id: &str,
    rating: &str,
) -> crate::support::TestResponse {
    let body = json!({
        "flashcard_id": flashcard_id,
        "rating": rating,
        "utc_offset_min": 120,
        "duration_ms": 3000,
    });
    server
        .post_json(&format!("/projects/{PROJECT}/review/answers"), &body)
        .await
}

async fn undo(server: &TestServer, answered_at_ms: &Value) -> crate::support::TestResponse {
    server
        .delete(&format!(
            "/projects/{PROJECT}/review/answers/{answered_at_ms}?{OFFSET}"
        ))
        .await
}

#[tokio::test(flavor = "multi_thread")]
async fn queues_a_new_flashcard_without_a_state() {
    let server = spawn_test_server(false).await;
    create_flashcard(&server, PROJECT, "Haus").await;
    assert_eq!(queue(&server).await["cards"][0]["state"], Value::Null);
}

#[tokio::test(flavor = "multi_thread")]
async fn gives_a_queued_card_the_interval_of_again() {
    let server = spawn_test_server(false).await;
    create_flashcard(&server, PROJECT, "Haus").await;
    assert_eq!(
        queue(&server).await["cards"][0]["intervals"]["again_ms"],
        600_000
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn an_answer_puts_a_forgotten_card_in_learning() {
    let server = spawn_test_server(false).await;
    let id = create_flashcard(&server, PROJECT, "Haus").await;
    let answered = answer(&server, &id, "again").await;
    assert_eq!(answered["state"]["state"], "learning");
}

#[tokio::test(flavor = "multi_thread")]
async fn a_learning_card_comes_back_into_the_queue() {
    let server = spawn_test_server(false).await;
    let id = create_flashcard(&server, PROJECT, "Haus").await;
    answer(&server, &id, "again").await;
    assert_eq!(
        queue(&server).await["cards"][0]["state"]["state"],
        "learning"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_graduated_card_leaves_the_queue() {
    let server = spawn_test_server(false).await;
    let id = create_flashcard(&server, PROJECT, "Haus").await;
    answer(&server, &id, "good").await;
    assert_eq!(queue(&server).await["cards"], json!([]));
}

#[tokio::test(flavor = "multi_thread")]
async fn undoing_the_answer_makes_the_card_new_again() {
    let server = spawn_test_server(false).await;
    let id = create_flashcard(&server, PROJECT, "Haus").await;
    let answered = answer(&server, &id, "good").await;
    let response = undo(&server, &answered["entry"]["answered_at_ms"]).await;
    assert_eq!(response.json()["state"], Value::Null);
}

#[tokio::test(flavor = "multi_thread")]
async fn undoing_the_answer_puts_the_card_back_in_the_queue() {
    let server = spawn_test_server(false).await;
    let id = create_flashcard(&server, PROJECT, "Haus").await;
    let answered = answer(&server, &id, "good").await;
    undo(&server, &answered["entry"]["answered_at_ms"]).await;
    assert_eq!(queue(&server).await["cards"][0]["flashcard"]["id"], id);
}

#[tokio::test(flavor = "multi_thread")]
async fn undoing_an_answer_that_is_not_the_latest_is_a_conflict() {
    let server = spawn_test_server(false).await;
    let first = create_flashcard(&server, PROJECT, "Haus").await;
    let second = create_flashcard(&server, PROJECT, "Tür").await;
    let answered = answer(&server, &first, "good").await;
    answer(&server, &second, "good").await;
    let response = undo(&server, &answered["entry"]["answered_at_ms"]).await;
    assert_eq!(response.status, 409);
}

#[tokio::test(flavor = "multi_thread")]
async fn answering_a_flashcard_of_another_project_is_not_found() {
    let server = spawn_test_server(false).await;
    let id = create_flashcard(&server, "placeholder-2", "Haus").await;
    let response = post_answer(&server, &id, "good").await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_summary_counts_the_new_cards() {
    let server = spawn_test_server(false).await;
    create_flashcard(&server, PROJECT, "Haus").await;
    let response = server
        .get(&format!("/projects/{PROJECT}/review?{OFFSET}"))
        .await;
    assert_eq!(response.json()["new_count"], 1);
}

#[tokio::test(flavor = "multi_thread")]
async fn raising_the_allowance_answers_no_content() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/review/allowance"),
            &json!({ "utc_offset_min": 120, "extra_new_cards": 20, "extra_reviews": 0 }),
        )
        .await;
    assert_eq!(response.status, 204);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_queue_of_an_unknown_project_is_not_found() {
    let server = spawn_test_server(false).await;
    let response = server
        .get(&format!("/projects/missing/review/queue?{OFFSET}"))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_project_counts_the_flashcards_never_answered() {
    let server = spawn_test_server(false).await;
    let id = create_flashcard(&server, PROJECT, "Haus").await;
    create_flashcard(&server, PROJECT, "Tür").await;
    answer(&server, &id, "again").await;
    let response = server.get(&format!("/projects/{PROJECT}")).await;
    assert_eq!(response.json()["unreviewed_count"], 1);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_review_counts_count_a_card_coming_back_as_learning() {
    let server = spawn_test_server(false).await;
    let id = create_flashcard(&server, PROJECT, "Haus").await;
    answer(&server, &id, "again").await;
    let response = server.get(&format!("/review/counts?{OFFSET}")).await;
    let listed = response.json();
    let counts = listed["projects"]
        .as_array()
        .unwrap()
        .iter()
        .find(|counts| counts["project_id"] == PROJECT)
        .unwrap()
        .clone();
    assert_eq!(counts["learning_count"], 1);
}

async fn hold(server: &TestServer, flashcard_id: &str, kind: &str) {
    let response = server
        .put_json(
            &format!("/projects/{PROJECT}/review/holds/{flashcard_id}"),
            &json!({ "kind": kind, "utc_offset_min": 120 }),
        )
        .await;
    assert_eq!(response.status, 204, "{}", response.text());
}

#[tokio::test(flavor = "multi_thread")]
async fn a_suspended_card_leaves_the_queue() {
    let server = spawn_test_server(false).await;
    let id = create_flashcard(&server, PROJECT, "Haus").await;
    hold(&server, &id, "suspended").await;
    assert_eq!(queue(&server).await["cards"], json!([]));
}

#[tokio::test(flavor = "multi_thread")]
async fn unsuspending_a_card_brings_it_back_into_the_queue() {
    let server = spawn_test_server(false).await;
    let id = create_flashcard(&server, PROJECT, "Haus").await;
    hold(&server, &id, "suspended").await;
    let response = server
        .delete(&format!("/projects/{PROJECT}/review/holds/{id}"))
        .await;
    assert_eq!(response.status, 204, "{}", response.text());
    assert_eq!(queue(&server).await["cards"][0]["flashcard"]["id"], id);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_suspended_flashcard_is_listed_as_suspended() {
    let server = spawn_test_server(false).await;
    let id = create_flashcard(&server, PROJECT, "Haus").await;
    hold(&server, &id, "suspended").await;
    let listed: Value = server
        .get(&format!("/projects/{PROJECT}/flashcards"))
        .await
        .json();
    assert_eq!(listed["flashcards"][0]["is_suspended"], true);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_buried_card_is_not_counted_as_unreviewed() {
    let server = spawn_test_server(false).await;
    let id = create_flashcard(&server, PROJECT, "Haus").await;
    hold(&server, &id, "buried").await;
    let project: Value = server.get(&format!("/projects/{PROJECT}")).await.json();
    assert_eq!(project["unreviewed_count"], 0);
}
