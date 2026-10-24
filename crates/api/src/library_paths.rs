//! Where the files of a library item live: `<uploads>/library/<item id>/`, holding the uploaded `source.<ext>`,
//! the `cues/<segment index>.m4a` clips and `cues/<segment index>.jpg` screenshots rendered at publish,
//! and the cover picture, `cover.<ext>` with the extension of its type.

use std::path::{Path, PathBuf};

use easyimmerse_core::image_media_type::image_extension;
use easyimmerse_core::library::LibraryItemId;

use crate::media_copy_files::extension_of;

const COVER_MEDIA_TYPES: [&str; 4] = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/// The files of one library item inside the uploads directory.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LibraryItemPaths {
    pub dir: PathBuf,
}

impl LibraryItemPaths {
    /// The files of the item with the id, or None for an id not of the form the server makes.
    /// The ids may come from a request path, and only a well-formed id is sure to stay inside the uploads directory.
    pub fn new(uploads_dir: &Path, item_id: &LibraryItemId) -> Option<Self> {
        item_id.is_well_formed().then(|| Self {
            dir: uploads_dir.join("library").join(&item_id.0),
        })
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

    /// The cover picture of the given media type, or None for a type the server does not keep covers in.
    pub fn cover(&self, media_type: &str) -> Option<PathBuf> {
        image_extension(media_type).map(|extension| self.dir.join(format!("cover.{extension}")))
    }

    /// Every place a cover picture of the item may be, one per type of picture.
    pub fn covers(&self) -> Vec<PathBuf> {
        COVER_MEDIA_TYPES
            .iter()
            .filter_map(|media_type| self.cover(media_type))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const ID: &str = "0123456789abcdef0123456789abcdef";

    fn paths() -> LibraryItemPaths {
        LibraryItemPaths::new(Path::new("uploads"), &LibraryItemId(ID.to_string())).unwrap()
    }

    fn in_item_dir(name: &str) -> PathBuf {
        Path::new("uploads/library").join(ID).join(name)
    }

    #[test]
    fn refuses_an_id_that_could_leave_the_uploads_directory() {
        let id = LibraryItemId("../escape".to_string());
        assert_eq!(LibraryItemPaths::new(Path::new("uploads"), &id), None);
    }

    #[test]
    fn names_the_source_after_the_uploaded_extension() {
        assert_eq!(paths().source("Film.MP4"), in_item_dir("source.mp4"));
    }

    #[test]
    fn names_a_source_without_an_extension_plainly() {
        assert_eq!(paths().source("film"), in_item_dir("source"));
    }

    #[test]
    fn names_the_cover_after_its_type() {
        assert_eq!(paths().cover("image/png"), Some(in_item_dir("cover.png")));
    }

    #[test]
    fn keeps_no_cover_of_another_type() {
        assert_eq!(paths().cover("image/svg+xml"), None);
    }

    #[test]
    fn keeps_the_clip_of_a_segment_under_its_index() {
        assert_eq!(paths().clip(3), in_item_dir("cues/3.m4a"));
    }
}
