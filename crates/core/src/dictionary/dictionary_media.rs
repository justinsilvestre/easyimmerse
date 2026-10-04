/// A file stored inside a dictionary, such as an image that its definitions show.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DictionaryMedia {
    /// The path by which definitions refer to the file.
    pub path: String,
    /// The MIME type, such as `image/png`.
    pub media_type: String,
    pub bytes: Vec<u8>,
}
