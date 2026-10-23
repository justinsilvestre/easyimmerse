//! Where the files of a library item live: `<uploads>/library/<item id>/`, holding the uploaded `source.<ext>`,
//! the `cues/<segment index>.m4a` clips and `cues/<segment index>.jpg` screenshots rendered at publish, and `cover.jpg`.

use std::path::{Path, PathBuf};

use easyimmerse_core::library::LibraryItemId;

use crate::media_copy_files::extension_of;

/// The files of one library item inside the uploads directory.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LibraryItemPaths {
    pub dir: PathBuf,
}

impl LibraryItemPaths {
    /// The item ids come from the server, so they hold only hexadecimal digits and stay inside the directory.
    pub fn new(uploads_dir: &Path, item_id: &LibraryItemId) -> Self {
        Self {
            dir: uploads_dir.join("library").join(&item_id.0),
        }
    }

    /// The uploaded file, named after the extension of its original name so that its type can be told.
    pub fn source(&self, file_name: &str) -> PathBuf {
        match extension_of(file_name) {
            Some(extension) => self.dir.join(format!("source.{extension}")),
            None => self.dir.join("source"),
        }
    }

    /// Where an upload is written before it replaces the source.
    pub fn upload(&self) -> PathBuf {
        self.dir.join("upload.part")
    }

    pub fn cues_dir(&self) -> PathBuf {
        self.dir.join("cues")
    }

    pub fn clip(&self, segment_index: u32) -> PathBuf {
        self.cues_dir().join(format!("{segment_index}.m4a"))
    }

    pub fn screenshot(&self, segment_index: u32) -> PathBuf {
        self.cues_dir().join(format!("{segment_index}.jpg"))
    }

    pub fn cover(&self) -> PathBuf {
        self.dir.join("cover.jpg")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn paths() -> LibraryItemPaths {
        LibraryItemPaths::new(Path::new("uploads"), &LibraryItemId("abc".to_string()))
    }

    #[test]
    fn names_the_source_after_the_uploaded_extension() {
        assert_eq!(
            paths().source("Film.MP4"),
            Path::new("uploads/library/abc/source.mp4")
        );
    }

    #[test]
    fn names_a_source_without_an_extension_plainly() {
        assert_eq!(
            paths().source("film"),
            Path::new("uploads/library/abc/source")
        );
    }

    #[test]
    fn keeps_the_clip_of_a_segment_under_its_index() {
        assert_eq!(paths().clip(3), Path::new("uploads/library/abc/cues/3.m4a"));
    }
}
