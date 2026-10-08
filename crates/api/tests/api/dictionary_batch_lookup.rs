use serde_json::{Value, json};

use crate::dictionaries::{finished, import_fixture, percent_encode};
use crate::support::{TestResponse, TestServer, spawn_test_server};

async fn look_up_batch(server: &TestServer, language: &str, texts: &[&str]) -> TestResponse {
    server
        .post_json(
            "/dictionaries/lookup/batch",
            &json!({ "language": language, "texts": texts }),
        )
        .await
}

async fn import_german_verbs(server: &TestServer) {
    let started = server
        .post_bytes(
            "/dictionaries?fileName=verbs.csv",
            "application/octet-stream",
            b"anrufen,to call\nrufen,to shout\n".to_vec(),
        )
        .await;
    finished(server, started).await;
}

/// Lists every character of the text as a position to look up at.
fn every_character(text: &str) -> Vec<usize> {
    (0..text.chars().count()).collect()
}

/// Lists the first character of each word as a position to look up at, for text whose words stand between spaces.
/// A single lookup inside a word may find what a lookup at its start finds, but a batch looks up only at word starts.
fn word_starts(text: &str) -> Vec<usize> {
    let characters: Vec<char> = text.chars().collect();
    (0..characters.len())
        .filter(|&offset| offset == 0 || characters[offset - 1] == ' ')
        .collect()
}

/// The single lookup's response at each of the offsets where it finds something.
async fn single_lookups(
    server: &TestServer,
    language: &str,
    text: &str,
    offsets: Vec<usize>,
) -> Vec<(u64, Value)> {
    let starts: Vec<usize> = text.char_indices().map(|(start, _)| start).collect();
    let mut found = Vec::new();
    for offset in offsets {
        let query = format!(
            "text={}&language={language}&context={}&offset={offset}",
            percent_encode(&text[starts[offset]..]),
            percent_encode(text)
        );
        let response = server
            .get(&format!("/dictionaries/lookup?{query}"))
            .await
            .json();
        if response["results"] != json!([]) || response["kanji"] != json!([]) {
            found.push((offset as u64, response));
        }
    }
    found
}

/// Rebuilds a single lookup's response for each position that the batch reports for one text.
fn rebuilt_lookups(batch: &Value, text_index: usize) -> Vec<(u64, Value)> {
    batch["texts"][text_index]["positions"]
        .as_array()
        .unwrap()
        .iter()
        .map(|position| {
            (
                position["offset"].as_u64().unwrap(),
                rebuilt(batch, position),
            )
        })
        .collect()
}

fn rebuilt(batch: &Value, position: &Value) -> Value {
    let pick = |pool: &str, indices: &Value| -> Vec<Value> {
        let indices = indices.as_array().unwrap();
        indices
            .iter()
            .map(|index| batch[pool][index.as_u64().unwrap() as usize].clone())
            .collect()
    };
    let results = pick("results", &position["results"]);
    let dictionary_ids: Vec<&Value> = results
        .iter()
        .flat_map(|result| result["definitions"].as_array().unwrap())
        .map(|definitions| &definitions["dictionaryId"])
        .collect();
    let stylesheets: Vec<&Value> = batch["stylesheets"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|stylesheet| dictionary_ids.contains(&&stylesheet["dictionaryId"]))
        .collect();
    json!({ "results": results, "kanji": pick("kanji", &position["kanji"]), "stylesheets": stylesheets })
}

async fn assert_batch_matches_single_lookups(
    server: &TestServer,
    language: &str,
    texts: &[&str],
    positions: fn(&str) -> Vec<usize>,
) {
    let batch = look_up_batch(server, language, texts).await.json();
    let mut expected = Vec::new();
    for text in texts {
        expected.push(single_lookups(server, language, text, positions(text)).await);
    }
    let actual: Vec<Vec<(u64, Value)>> = (0..texts.len())
        .map(|text_index| rebuilt_lookups(&batch, text_index))
        .collect();
    assert_eq!(actual, expected);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_batch_lookup_matches_single_lookups_of_japanese_text() {
    let server = spawn_test_server(false).await;
    import_fixture(&server).await;
    let texts = ["猫が本を食べた。", "「犬と猫」、本。"];
    assert_batch_matches_single_lookups(&server, "ja", &texts, every_character).await;
}

#[tokio::test(flavor = "multi_thread")]
async fn a_batch_lookup_matches_single_lookups_of_a_separated_particle_verb() {
    let server = spawn_test_server(false).await;
    import_german_verbs(&server).await;
    let texts = ["Ich rufe dich an.", "Rufen wir an?"];
    assert_batch_matches_single_lookups(&server, "de", &texts, word_starts).await;
}

#[tokio::test(flavor = "multi_thread")]
async fn a_batch_lookup_answers_each_text_in_the_order_requested() {
    let server = spawn_test_server(false).await;
    import_fixture(&server).await;
    let batch = look_up_batch(&server, "ja", &["猫", "。", "犬"])
        .await
        .json();
    let offsets: Vec<Vec<u64>> = (0..3)
        .map(|text_index| {
            rebuilt_lookups(&batch, text_index)
                .into_iter()
                .map(|(offset, _)| offset)
                .collect()
        })
        .collect();
    assert_eq!(offsets, vec![vec![0], vec![], vec![0]]);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_batch_lookup_sends_a_result_found_in_several_texts_once() {
    let server = spawn_test_server(false).await;
    import_fixture(&server).await;
    let once = look_up_batch(&server, "ja", &["猫"]).await.json();
    let twice = look_up_batch(&server, "ja", &["猫", "猫"]).await.json();
    assert_eq!(twice["results"], once["results"]);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_batch_lookup_of_more_than_100_texts_is_a_bad_request() {
    let server = spawn_test_server(false).await;
    let response = look_up_batch(&server, "ja", &["猫"; 101]).await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_batch_lookup_of_a_text_longer_than_2000_characters_is_a_bad_request() {
    let server = spawn_test_server(false).await;
    let text = "猫".repeat(2001);
    let response = look_up_batch(&server, "ja", &[&text]).await;
    assert_eq!(response.status, 400);
}
