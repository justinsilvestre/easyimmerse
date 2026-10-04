use crate::dictionary::{
    DictionaryError, DictionaryFormatKind, DictionaryMetadata, DictionarySource, file_name,
};

use super::header::Header;

/// The value MdxBuilder leaves in `Title` when the author did not set one.
const PLACEHOLDER_TITLE: &str = "Title (No HTML code allowed)";

/// Builds the metadata from the header, falling back to the file name for a missing title.
pub fn build_metadata(
    header: &Header,
    mdx_name: &str,
    stylesheet: Option<String>,
) -> DictionaryMetadata {
    let attributes = &header.attributes;
    let title = attributes
        .non_empty("Title")
        .filter(|title| *title != PLACEHOLDER_TITLE)
        .map_or_else(|| file_stem(mdx_name).to_string(), String::from);
    let mut metadata = DictionaryMetadata::new(title, DictionaryFormatKind::Mdict);
    metadata.description = attributes.non_empty("Description").map(String::from);
    metadata.revision = attributes.non_empty("CreationDate").map(String::from);
    metadata.stylesheet = stylesheet;
    metadata
}

/// Reads the CSS file shipped beside the `.mdx`, preferring one with the same stem.
pub fn read_stylesheet(
    source: &mut DictionarySource,
    mdx_name: &str,
) -> Result<Option<String>, DictionaryError> {
    let same_stem = format!("{}.css", file_stem(mdx_name)).to_ascii_lowercase();
    let name = source
        .find(|name| name.to_ascii_lowercase() == same_stem)
        .or_else(|| source.find(|name| name.to_ascii_lowercase().ends_with(".css")))
        .map(String::from);
    let Some(name) = name else {
        return Ok(None);
    };
    let bytes = source.read(&name)?;
    let text = String::from_utf8_lossy(&bytes);
    Ok(Some(text.trim_start_matches('\u{feff}').to_string()))
}

fn file_stem(name: &str) -> &str {
    let name = file_name(name);
    name.rsplit_once('.').map_or(name, |(stem, _)| stem)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::SourceFile;
    use crate::dictionary::mdict::header::FormatVersion;
    use crate::dictionary::mdict::header_attributes::HeaderAttributes;

    fn metadata(attributes: &str) -> DictionaryMetadata {
        let header = Header {
            version: FormatVersion::V2,
            attributes: HeaderAttributes::parse(&format!("<Dictionary {attributes}/>")),
            key_info_encrypted: false,
        };
        build_metadata(&header, "dicts/Animals.mdx", None)
    }

    #[test]
    fn reads_the_title() {
        assert_eq!(
            metadata(r#"Title="Animals of the World""#).title,
            "Animals of the World"
        );
    }

    #[test]
    fn falls_back_to_the_file_name_for_the_placeholder_title() {
        assert_eq!(
            metadata(r#"Title="Title (No HTML code allowed)""#).title,
            "Animals"
        );
    }

    #[test]
    fn reads_the_creation_date_as_the_revision() {
        let revision = metadata(r#"CreationDate="2026-10-5""#).revision;
        assert_eq!(revision.as_deref(), Some("2026-10-5"));
    }

    #[test]
    fn reads_the_stylesheet_beside_the_mdx() {
        let files = vec![
            SourceFile {
                name: "other.css".into(),
                bytes: b"b{}".to_vec(),
            },
            SourceFile {
                name: "Animals.css".into(),
                bytes: b"\xEF\xBB\xBFi{}".to_vec(),
            },
        ];
        let mut source = DictionarySource::new(files).unwrap();
        let stylesheet = read_stylesheet(&mut source, "Animals.mdx").unwrap();
        assert_eq!(stylesheet.as_deref(), Some("i{}"));
    }
}
