//! Frequency values, which term and kanji meta banks share.

use serde_json::Value;

use super::super::term_meta::Frequency;

/// Reads a frequency given as a number, as a string, or as `{value, displayValue}`.
/// A string is shown as it is and sorted by the first number in it.
pub fn frequency(value: &Value) -> Option<Frequency> {
    match value {
        Value::Number(number) => Some(Frequency {
            value: number.as_f64(),
            display: None,
        }),
        Value::String(text) => Some(Frequency {
            value: first_number(text),
            display: Some(text.clone()),
        }),
        Value::Object(fields) => Some(Frequency {
            value: Some(fields.get("value")?.as_f64()?),
            display: fields
                .get("displayValue")
                .and_then(Value::as_str)
                .map(String::from),
        }),
        _ => None,
    }
}

/// Finds the first run of digits, with an optional decimal fraction, and reads it as a number.
fn first_number(text: &str) -> Option<f64> {
    let start = text.find(|character: char| character.is_ascii_digit())?;
    let rest = &text[start..];
    let end = rest
        .char_indices()
        .find(|&(index, character)| !is_number_part(rest, index, character))
        .map_or(rest.len(), |(index, _)| index);
    rest[..end].trim_end_matches('.').parse().ok()
}

/// Accepts digits, and a single decimal point that follows a digit.
fn is_number_part(text: &str, index: usize, character: char) -> bool {
    character.is_ascii_digit() || (character == '.' && !text[..index].contains('.'))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn value_of(frequency_value: Value) -> Option<f64> {
        frequency(&frequency_value).and_then(|frequency| frequency.value)
    }

    #[test]
    fn reads_a_number() {
        assert_eq!(value_of(json!(120)), Some(120.0));
    }

    #[test]
    fn reads_a_value_with_its_display_text() {
        assert_eq!(
            frequency(&json!({"value": 340, "displayValue": "340㋕"})),
            Some(Frequency {
                value: Some(340.0),
                display: Some("340㋕".into()),
            })
        );
    }

    #[test]
    fn shows_a_string_as_it_is() {
        let display = frequency(&json!("12/40")).and_then(|frequency| frequency.display);
        assert_eq!(display.as_deref(), Some("12/40"));
    }

    #[test]
    fn sorts_a_string_by_its_first_number() {
        assert_eq!(value_of(json!("㋕12/40")), Some(12.0));
    }

    #[test]
    fn reads_a_decimal_fraction_in_a_string() {
        assert_eq!(value_of(json!("rank 1.5.2")), Some(1.5));
    }

    #[test]
    fn ignores_a_trailing_point_in_a_string() {
        assert_eq!(value_of(json!("7.")), Some(7.0));
    }

    #[test]
    fn has_no_value_for_a_string_without_digits() {
        assert_eq!(value_of(json!("rare")), None);
    }

    #[test]
    fn rejects_an_object_without_a_value() {
        assert_eq!(frequency(&json!({"displayValue": "x"})), None);
    }
}
