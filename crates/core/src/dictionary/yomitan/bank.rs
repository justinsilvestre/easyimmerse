//! Finding bank files and reading their rows one at a time.

use std::fmt;
use std::marker::PhantomData;

use serde::de::{self, DeserializeOwned, Deserializer, SeqAccess, Visitor};

use super::super::error::DictionaryError;
use super::super::source::{DictionarySource, file_name};
use super::error::YomitanError;

/// Lists the files of one kind of bank, such as `term_bank`, in numeric order,
/// so that `term_bank_2.json` comes before `term_bank_10.json`.
pub fn bank_names(source: &DictionarySource, kind: &str) -> Vec<String> {
    let mut banks: Vec<(u32, String)> = source
        .names()
        .filter_map(|name| Some((bank_number(file_name(name), kind)?, name.to_string())))
        .collect();
    banks.sort();
    banks.into_iter().map(|(_, name)| name).collect()
}

/// Returns `N` when the file name is exactly `<kind>_N.json`.
fn bank_number(file_name: &str, kind: &str) -> Option<u32> {
    let digits = file_name
        .strip_prefix(kind)?
        .strip_prefix('_')?
        .strip_suffix(".json")?;
    if digits.is_empty() || !digits.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }
    digits.parse().ok()
}

/// Reads a bank and passes each row to `on_row` with its index, deserializing one row at a time.
/// The first error from `on_row` stops the reading and is returned.
pub fn read_rows<Row, OnRow>(
    source: &mut DictionarySource,
    name: &str,
    on_row: OnRow,
) -> Result<(), DictionaryError>
where
    Row: DeserializeOwned,
    OnRow: FnMut(usize, Row) -> Result<(), DictionaryError>,
{
    let bytes = source.read(name)?;
    let mut visitor = RowVisitor {
        on_row,
        failure: None,
        row: PhantomData,
    };
    let mut deserializer = serde_json::Deserializer::from_slice(&bytes);
    let result = deserializer
        .deserialize_seq(&mut visitor)
        .and_then(|()| deserializer.end());
    match (visitor.failure, result) {
        (Some(failure), _) => Err(failure),
        (None, Err(source)) => Err(json_error(name, source)),
        (None, Ok(())) => Ok(()),
    }
}

pub fn json_error(name: &str, source: serde_json::Error) -> DictionaryError {
    YomitanError::Json {
        name: name.to_string(),
        source,
    }
    .into()
}

struct RowVisitor<Row, OnRow> {
    on_row: OnRow,
    failure: Option<DictionaryError>,
    row: PhantomData<Row>,
}

impl<'de, Row, OnRow> Visitor<'de> for &mut RowVisitor<Row, OnRow>
where
    Row: DeserializeOwned,
    OnRow: FnMut(usize, Row) -> Result<(), DictionaryError>,
{
    type Value = ();

    fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        formatter.write_str("an array of rows")
    }

    fn visit_seq<Rows: SeqAccess<'de>>(self, mut rows: Rows) -> Result<(), Rows::Error> {
        let mut index = 0;
        while let Some(row) = rows.next_element::<Row>()? {
            if let Err(failure) = (self.on_row)(index, row) {
                self.failure = Some(failure);
                return Err(de::Error::custom("stopped reading after an error"));
            }
            index += 1;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::yomitan::test_source::source_of;

    fn read_all(text: &str) -> Result<Vec<(usize, u32)>, DictionaryError> {
        let mut rows = Vec::new();
        read_rows(
            &mut source_of(&[("bank.json", text)]),
            "bank.json",
            |index, row| {
                rows.push((index, row));
                Ok(())
            },
        )?;
        Ok(rows)
    }

    #[test]
    fn lists_banks_in_numeric_order() {
        let source = source_of(&[("term_bank_10.json", ""), ("term_bank_2.json", "")]);
        assert_eq!(
            bank_names(&source, "term_bank"),
            vec!["term_bank_2.json", "term_bank_10.json"]
        );
    }

    #[test]
    fn leaves_out_banks_of_another_kind() {
        let source = source_of(&[("term_meta_bank_1.json", ""), ("term_bank_1.json", "")]);
        assert_eq!(bank_names(&source, "term_bank"), vec!["term_bank_1.json"]);
    }

    #[test]
    fn leaves_out_names_with_more_than_a_number() {
        let source = source_of(&[("term_bank_1 copy.json", "")]);
        assert!(bank_names(&source, "term_bank").is_empty());
    }

    #[test]
    fn finds_banks_inside_a_folder() {
        let source = source_of(&[("dict/tag_bank_1.json", "")]);
        assert_eq!(
            bank_names(&source, "tag_bank"),
            vec!["dict/tag_bank_1.json"]
        );
    }

    #[test]
    fn reads_each_row_with_its_index() {
        assert_eq!(read_all("[7, 8]").unwrap(), vec![(0, 7), (1, 8)]);
    }

    #[test]
    fn fails_on_a_malformed_row() {
        assert!(matches!(
            read_all(r#"[7, "x"]"#),
            Err(DictionaryError::Yomitan(YomitanError::Json { .. }))
        ));
    }

    #[test]
    fn fails_on_trailing_content() {
        assert!(read_all("[7] [8]").is_err());
    }

    #[test]
    fn returns_the_error_of_the_row_handler() {
        let result = read_rows(
            &mut source_of(&[("bank.json", "[1]")]),
            "bank.json",
            |_, _: u32| Err(DictionaryError::UnrecognizedFormat),
        );
        assert!(matches!(result, Err(DictionaryError::UnrecognizedFormat)));
    }
}
