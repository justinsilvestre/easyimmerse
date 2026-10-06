//! Sample media, subtitles, and dictionaries for the placeholder projects of development builds.

use std::path::{Path, PathBuf};

use easyimmerse_core::media_file::MediaFileSource;
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::subtitle_track::SubtitleSelection;
use easyimmerse_core::text_source::TextSource;
use easyimmerse_core::timed_text::{TimedTextError, TimedTextFormat, parse_srt};
use thiserror::Error;

use crate::{NewSubtitleTrack, Storage, StorageError};

mod dictionaries;

/// Marks a database that already received the sample content, so that what the user removes stays removed.
const SEEDED_PREFERENCE: &str = "sample_content_seeded";
const VIDEO_NAME: &str = "sample.mp4";
const BOOK_NAME: &str = "ginga-tetsudo-no-yoru.epub";
const BOOK_PROJECT_ID: &str = "placeholder-2";
const TRANSLATION_NAME: &str = "sample.srt";

struct SampleProject {
    id: &'static str,
    subtitles_name: &'static str,
    subtitles: &'static str,
}

const SAMPLE_PROJECTS: [SampleProject; 2] = [
    SampleProject {
        id: "placeholder-1",
        subtitles_name: "sample.es.srt",
        subtitles: include_str!("sample_content/sample.es.srt"),
    },
    SampleProject {
        id: "placeholder-2",
        subtitles_name: "sample.ja.srt",
        subtitles: include_str!("sample_content/sample.ja.srt"),
    },
];

#[derive(Debug, Error)]
pub enum SampleContentError {
    #[error("could not read the fixture {path:?}: {source}")]
    Fixture {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("the sample subtitles are malformed: {0}")]
    Subtitles(#[from] TimedTextError),
    #[error(transparent)]
    Storage(#[from] StorageError),
}

pub fn seed_sample_content(
    storage: &Storage,
    fixtures_dir: &Path,
) -> Result<(), SampleContentError> {
    if storage.get_preference(SEEDED_PREFERENCE)?.is_some() {
        return Ok(());
    }
    let fixtures = read_fixtures(fixtures_dir)?;
    for project in &SAMPLE_PROJECTS {
        add_sample_media(storage, project, &fixtures)?;
    }
    add_sample_book(storage, &fixtures)?;
    dictionaries::import_sample_dictionaries(storage, fixtures.dictionary)?;
    Ok(storage.set_preference(SEEDED_PREFERENCE, "true")?)
}

/// Adds a Japanese novel to the Japanese placeholder project, unless the project is gone.
fn add_sample_book(storage: &Storage, fixtures: &Fixtures) -> Result<(), SampleContentError> {
    let project_id = ProjectId(BOOK_PROJECT_ID.to_string());
    match storage.get_project(&project_id) {
        Err(StorageError::ProjectNotFound(_)) => return Ok(()),
        result => result?,
    };
    let source = MediaFileSource::Path {
        path: fixtures.book_path.clone(),
    };
    storage.add_media_file(&project_id, BOOK_NAME, &source)?;
    Ok(())
}

/// The files that the sample content takes from the repository's fixtures.
/// They are read before anything is written, so that a build without the repository adds nothing.
struct Fixtures {
    video_path: String,
    book_path: String,
    translation: String,
    dictionary: Vec<u8>,
}

fn read_fixtures(dir: &Path) -> Result<Fixtures, SampleContentError> {
    let dir = dir
        .canonicalize()
        .map_err(|source| fixture_error(dir, source))?;
    let video = dir.join(VIDEO_NAME);
    std::fs::metadata(&video).map_err(|source| fixture_error(&video, source))?;
    let book = dir.join(BOOK_NAME);
    std::fs::metadata(&book).map_err(|source| fixture_error(&book, source))?;
    let translation = read_fixture(&dir.join(TRANSLATION_NAME))?;
    Ok(Fixtures {
        video_path: video.to_string_lossy().into_owned(),
        book_path: book.to_string_lossy().into_owned(),
        translation: String::from_utf8_lossy(&translation).into_owned(),
        dictionary: read_fixture(&dir.join(dictionaries::FIXTURE_DICTIONARY))?,
    })
}

fn add_sample_media(
    storage: &Storage,
    project: &SampleProject,
    fixtures: &Fixtures,
) -> Result<(), SampleContentError> {
    let project_id = ProjectId(project.id.to_string());
    if !is_empty_project(storage, &project_id)? {
        return Ok(());
    }
    let target = new_track(project.subtitles_name, project.subtitles)?;
    let translation = new_track(TRANSLATION_NAME, &fixtures.translation)?;
    let video = MediaFileSource::Path {
        path: fixtures.video_path.clone(),
    };
    let media = storage.add_media_file(&project_id, VIDEO_NAME, &video)?;
    let selection = SubtitleSelection {
        target_track_id: Some(storage.add_subtitle_track(&media.id, &target)?.id),
        translation_track_id: Some(storage.add_subtitle_track(&media.id, &translation)?.id),
    };
    Ok(storage.set_subtitle_selection(&media.id, &selection)?)
}

fn is_empty_project(storage: &Storage, id: &ProjectId) -> Result<bool, StorageError> {
    match storage.get_project(id) {
        Ok(project) => Ok(project.media_count == 0),
        Err(StorageError::ProjectNotFound(_)) => Ok(false),
        Err(error) => Err(error),
    }
}

fn new_track(name: &str, text: &str) -> Result<NewSubtitleTrack, TimedTextError> {
    Ok(NewSubtitleTrack {
        name: name.to_string(),
        format: TimedTextFormat::Srt,
        source: TextSource::Inline {
            text: text.to_string(),
        },
        sample: parse_srt(text)?.cues.first().map(|cue| cue.text.clone()),
    })
}

fn read_fixture(path: &Path) -> Result<Vec<u8>, SampleContentError> {
    std::fs::read(path).map_err(|source| fixture_error(path, source))
}

fn fixture_error(path: &Path, source: std::io::Error) -> SampleContentError {
    SampleContentError::Fixture {
        path: path.to_path_buf(),
        source,
    }
}

#[cfg(test)]
mod tests;
