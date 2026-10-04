use super::byte_cursor::ByteCursor;

/// One field of a StarDict entry: a type letter and its data.
/// Lowercase types hold text; uppercase types hold binary data such as sounds and images.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Field<'a> {
    pub kind: u8,
    pub data: &'a [u8],
}

/// Splits the data of one entry into its fields.
///
/// Without a `sametypesequence`, each field starts with its type letter.
/// With one, the letters are left out, and the last field has no terminator or size because the entry's size marks its end.
/// Returns `None` when a binary field claims more bytes than the entry holds.
pub fn split_fields<'a>(
    data: &'a [u8],
    same_type_sequence: Option<&[u8]>,
) -> Option<Vec<Field<'a>>> {
    let mut cursor = ByteCursor::new(data);
    match same_type_sequence {
        Some(sequence) => split_sequenced_fields(&mut cursor, sequence),
        None => split_typed_fields(&mut cursor),
    }
}

fn split_typed_fields<'a>(cursor: &mut ByteCursor<'a>) -> Option<Vec<Field<'a>>> {
    let mut fields = Vec::new();
    while let Some(&[kind]) = cursor.take(1) {
        let data = read_field_data(cursor, kind)?;
        fields.push(Field { kind, data });
    }
    Some(fields)
}

fn split_sequenced_fields<'a>(
    cursor: &mut ByteCursor<'a>,
    sequence: &[u8],
) -> Option<Vec<Field<'a>>> {
    let Some((&last_kind, leading_kinds)) = sequence.split_last() else {
        return Some(Vec::new());
    };
    let mut fields = Vec::with_capacity(sequence.len());
    for &kind in leading_kinds {
        let data = read_field_data(cursor, kind)?;
        fields.push(Field { kind, data });
    }
    fields.push(Field {
        kind: last_kind,
        data: cursor.take_rest(),
    });
    Some(fields)
}

fn read_field_data<'a>(cursor: &mut ByteCursor<'a>, kind: u8) -> Option<&'a [u8]> {
    if kind.is_ascii_lowercase() {
        Some(cursor.take_until_nul())
    } else {
        let size = usize::try_from(cursor.take_u32()?).ok()?;
        cursor.take(size)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn field(kind: u8, data: &[u8]) -> Field<'_> {
        Field { kind, data }
    }

    #[test]
    fn splits_typed_text_fields() {
        assert_eq!(
            split_fields(b"tk\xc3\xa6t\0mcat\0", None),
            Some(vec![field(b't', "kæt".as_bytes()), field(b'm', b"cat")])
        );
    }

    #[test]
    fn splits_a_typed_binary_field_by_its_size() {
        assert_eq!(
            split_fields(b"W\0\0\0\x02\0\x01mcat\0", None),
            Some(vec![field(b'W', b"\0\x01"), field(b'm', b"cat")])
        );
    }

    #[test]
    fn accepts_a_final_text_field_without_a_terminator() {
        assert_eq!(split_fields(b"mcat", None), Some(vec![field(b'm', b"cat")]));
    }

    #[test]
    fn rejects_a_binary_field_longer_than_the_entry() {
        assert_eq!(split_fields(b"W\0\0\0\x09\0\x01", None), None);
    }

    #[test]
    fn splits_fields_by_the_same_type_sequence() {
        assert_eq!(
            split_fields(b"k\xc3\xa6t\0a small animal", Some(b"tm")),
            Some(vec![
                field(b't', "kæt".as_bytes()),
                field(b'm', b"a small animal")
            ])
        );
    }

    #[test]
    fn reads_a_final_binary_field_without_a_size() {
        assert_eq!(
            split_fields(b"cat\0\x89PNG", Some(b"mP")),
            Some(vec![field(b'm', b"cat"), field(b'P', b"\x89PNG")])
        );
    }

    #[test]
    fn reads_a_sized_binary_field_before_the_last_field() {
        assert_eq!(
            split_fields(b"\0\0\0\x01\x07cat", Some(b"Wm")),
            Some(vec![field(b'W', b"\x07"), field(b'm', b"cat")])
        );
    }
}
