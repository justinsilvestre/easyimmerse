use crate::dictionary::{DictionaryFormatKind, DictionaryMetadata};

use super::ifo::Ifo;

impl Ifo {
    /// Builds the dictionary metadata, using the fallback title when the `.ifo` names none.
    pub fn metadata(&self, fallback_title: &str) -> DictionaryMetadata {
        let title = self.get("bookname").unwrap_or(fallback_title);
        let mut metadata = DictionaryMetadata::new(title, DictionaryFormatKind::Stardict);
        metadata.description = self.get("description").map(replace_line_break_tags);
        metadata.author = self.get("author").map(String::from);
        metadata.url = self.get("website").map(String::from);
        metadata.revision = self.get("date").map(String::from);
        if let Some(lang) = self.get("lang") {
            (metadata.source_language, metadata.target_language) = split_languages(lang);
        }
        metadata
    }
}

fn replace_line_break_tags(description: &str) -> String {
    ["<br />", "<br/>", "<br>"]
        .iter()
        .fold(description.to_string(), |text, tag| text.replace(tag, "\n"))
}

/// Reads the `lang` key, which the StarDict specification does not define.
/// Tools write either one language tag or a pair of two- or three-letter codes such as `en-ja`.
fn split_languages(lang: &str) -> (Option<String>, Option<String>) {
    match lang.split_once('-') {
        Some((source, target)) if is_language_code(source) && is_language_code(target) => {
            (Some(source.to_string()), Some(target.to_string()))
        }
        _ => (Some(lang.to_string()), None),
    }
}

fn is_language_code(code: &str) -> bool {
    (2..=3).contains(&code.len()) && code.bytes().all(|byte| byte.is_ascii_lowercase())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn metadata(lines: &str) -> DictionaryMetadata {
        Ifo::parse(format!("StarDict's dict ifo file\nversion=2.4.2\n{lines}").as_bytes())
            .unwrap()
            .metadata("fallback")
    }

    #[test]
    fn reads_the_book_name_as_the_title() {
        assert_eq!(metadata("bookname=Sample").title, "Sample");
    }

    #[test]
    fn falls_back_to_the_given_title() {
        assert_eq!(metadata("").title, "fallback");
    }

    #[test]
    fn reads_the_website_as_the_url() {
        assert_eq!(
            metadata("website=https://example.com").url.as_deref(),
            Some("https://example.com")
        );
    }

    #[test]
    fn reads_the_date_as_the_revision() {
        assert_eq!(
            metadata("date=2026.10.05").revision.as_deref(),
            Some("2026.10.05")
        );
    }

    #[test]
    fn turns_line_break_tags_in_the_description_into_newlines() {
        assert_eq!(
            metadata("description=One.<br>Two.").description.as_deref(),
            Some("One.\nTwo.")
        );
    }

    #[test]
    fn reads_a_language_pair() {
        let metadata = metadata("lang=en-ja");
        assert_eq!(
            (metadata.source_language, metadata.target_language),
            (Some("en".to_string()), Some("ja".to_string()))
        );
    }

    #[test]
    fn reads_a_single_language_tag_as_the_source_language() {
        assert_eq!(
            metadata("lang=zh-Hans").source_language.as_deref(),
            Some("zh-Hans")
        );
    }
}
