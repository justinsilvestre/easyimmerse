use super::super::source::{DictionarySource, file_name};

/// Extensions that mark a file as a table without looking inside it.
const TABLE_EXTENSIONS: [&str; 3] = ["csv", "tsv", "tab"];

/// Finds the one table in a source: a `.csv`, `.tsv` or `.tab` file, or failing that a `.txt` file.
pub fn table_file_name(source: &DictionarySource) -> Option<&str> {
    let names: Vec<&str> = source
        .names()
        .filter(|name| !is_system_file(name))
        .collect();
    let with_extension = |wanted: fn(&str) -> bool| {
        names
            .iter()
            .copied()
            .filter(move |name| wanted(&extension(name)))
    };
    only(with_extension(|extension| {
        TABLE_EXTENSIONS.contains(&extension)
    }))
    .or_else(|| only(with_extension(|extension| extension == "txt")))
}

/// Returns the lowercase extension of a file name, or an empty string.
pub fn extension(name: &str) -> String {
    let extension = file_name(name)
        .rsplit_once('.')
        .map(|(_, extension)| extension);
    extension.unwrap_or_default().to_lowercase()
}

/// Returns the file name without its directories or extension.
pub fn stem(name: &str) -> &str {
    let name = file_name(name);
    name.rsplit_once('.').map_or(name, |(stem, _)| stem)
}

fn only<'a>(mut names: impl Iterator<Item = &'a str>) -> Option<&'a str> {
    let first = names.next()?;
    names.next().is_none().then_some(first)
}

/// Recognises files that archiving tools add, such as macOS resource forks.
fn is_system_file(name: &str) -> bool {
    name.starts_with("__MACOSX/") || file_name(name).starts_with('.')
}

#[cfg(test)]
mod tests {
    use super::super::super::source::SourceFile;
    use super::*;

    fn source(names: &[&str]) -> DictionarySource {
        let file = |name: &&str| SourceFile {
            name: name.to_string(),
            bytes: b"a,b".to_vec(),
        };
        DictionarySource::new(names.iter().map(file).collect()).unwrap()
    }

    #[test]
    fn finds_a_csv_file() {
        assert_eq!(table_file_name(&source(&["words.CSV"])), Some("words.CSV"));
    }

    #[test]
    fn prefers_a_tsv_file_to_a_text_file() {
        assert_eq!(
            table_file_name(&source(&["readme.txt", "words.tsv"])),
            Some("words.tsv")
        );
    }

    #[test]
    fn finds_a_lone_text_file() {
        assert_eq!(
            table_file_name(&source(&["words.txt", ".DS_Store"])),
            Some("words.txt")
        );
    }

    #[test]
    fn rejects_two_tables() {
        assert_eq!(table_file_name(&source(&["a.csv", "b.csv"])), None);
    }

    #[test]
    fn rejects_other_files() {
        assert_eq!(table_file_name(&source(&["words.ifo"])), None);
    }

    #[test]
    fn strips_the_directories_and_extension_for_the_stem() {
        assert_eq!(stem("dicts/animals.tsv"), "animals");
    }
}
