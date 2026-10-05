use std::path::PathBuf;

use easyimmerse_core::dictionary::DictionarySource;
use easyimmerse_core::media_file::{MediaFileId, MediaFileSource};
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::subtitle_track::SubtitleTrackId;

use super::*;

fn fixtures_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures")
}

fn placeholder_storage() -> Storage {
    let storage = Storage::open_in_memory().unwrap();
    storage.seed_placeholder_projects().unwrap();
    storage
}

fn seeded_storage() -> Storage {
    let storage = placeholder_storage();
    seed_sample_content(&storage, &fixtures_dir()).unwrap();
    storage
}

fn spanish_project() -> ProjectId {
    ProjectId("placeholder-1".to_string())
}

fn media_names(storage: &Storage, project_id: &ProjectId) -> Vec<String> {
    let media_files = storage.list_media_files(project_id).unwrap();
    media_files.into_iter().map(|media| media.name).collect()
}

fn only_media_id(storage: &Storage, project_id: &ProjectId) -> MediaFileId {
    storage.list_media_files(project_id).unwrap()[0].id.clone()
}

fn track_name(storage: &Storage, id: Option<SubtitleTrackId>) -> String {
    storage.get_subtitle_track(&id.unwrap()).unwrap().track.name
}

fn dictionary_titles(storage: &Storage) -> Vec<String> {
    let dictionaries = storage.list_dictionaries().unwrap();
    dictionaries.into_iter().map(|d| d.metadata.title).collect()
}

#[test]
fn gives_the_japanese_project_the_sample_video() {
    let storage = seeded_storage();
    let japanese_project = ProjectId("placeholder-2".to_string());
    assert_eq!(media_names(&storage, &japanese_project), vec!["sample.mp4"]);
}

#[test]
fn shows_the_spanish_subtitles_as_the_target_track() {
    let storage = seeded_storage();
    let media_id = only_media_id(&storage, &spanish_project());
    let selection = storage.get_subtitle_selection(&media_id).unwrap();
    assert_eq!(
        track_name(&storage, selection.target_track_id),
        "sample.es.srt"
    );
}

#[test]
fn shows_the_english_subtitles_as_the_translation() {
    let storage = seeded_storage();
    let media_id = only_media_id(&storage, &spanish_project());
    let selection = storage.get_subtitle_selection(&media_id).unwrap();
    assert_eq!(
        track_name(&storage, selection.translation_track_id),
        "sample.srt"
    );
}

#[test]
fn imports_the_sample_dictionaries() {
    assert_eq!(
        dictionary_titles(&seeded_storage()),
        vec![
            "Sample Dictionary",
            "Sample Spanish-English words",
            "Sample Japanese-English words",
        ]
    );
}

#[test]
fn finds_a_spanish_verb_under_an_inflected_form() {
    let entries = seeded_storage()
        .find_dictionary_entries(&["está".to_string()])
        .unwrap();
    assert_eq!(entries[0].entry.term, "estar");
}

#[test]
fn leaves_a_project_that_has_media_as_it_was() {
    let storage = placeholder_storage();
    let source = MediaFileSource::Path {
        path: "/videos/mine.mp4".to_string(),
    };
    storage
        .add_media_file(&spanish_project(), "mine.mp4", &source)
        .unwrap();
    seed_sample_content(&storage, &fixtures_dir()).unwrap();
    assert_eq!(media_names(&storage, &spanish_project()), vec!["mine.mp4"]);
}

#[test]
fn skips_a_dictionary_whose_title_is_already_stored() {
    let storage = placeholder_storage();
    let (name, bytes) = dictionaries::WORD_LISTS[0];
    let mut source = DictionarySource::single(name, bytes.to_vec()).unwrap();
    storage.import_dictionary(&mut source).unwrap();
    seed_sample_content(&storage, &fixtures_dir()).unwrap();
    assert_eq!(dictionary_titles(&storage).len(), 3);
}

#[test]
fn adds_nothing_when_run_again() {
    let storage = seeded_storage();
    seed_sample_content(&storage, &fixtures_dir()).unwrap();
    assert_eq!(media_names(&storage, &spanish_project()).len(), 1);
}

#[test]
fn leaves_removed_sample_media_removed_when_run_again() {
    let storage = seeded_storage();
    let media_id = only_media_id(&storage, &spanish_project());
    storage.remove_media_file(&media_id).unwrap();
    seed_sample_content(&storage, &fixtures_dir()).unwrap();
    assert!(media_names(&storage, &spanish_project()).is_empty());
}

#[test]
fn reports_a_missing_fixtures_directory() {
    let result = seed_sample_content(&placeholder_storage(), Path::new("/missing"));
    assert!(matches!(result, Err(SampleContentError::Fixture { .. })));
}
