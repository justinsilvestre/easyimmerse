use std::collections::HashMap;

/// The attributes of the header's single element, keyed by lowercase name.
///
/// The element is not always well-formed XML: values may hold raw line breaks, so this scans
/// `name="value"` pairs leniently instead of using an XML parser.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct HeaderAttributes(HashMap<String, String>);

impl HeaderAttributes {
    pub fn parse(element: &str) -> Self {
        let mut attributes = HashMap::new();
        let mut rest = element;
        while let Some((name, value, after)) = next_attribute(rest) {
            attributes.insert(name.to_ascii_lowercase(), unescape(value));
            rest = after;
        }
        Self(attributes)
    }

    /// Looks up an attribute by name, ignoring case, since files spell names such as `StripKey` inconsistently.
    pub fn get(&self, name: &str) -> Option<&str> {
        self.0.get(&name.to_ascii_lowercase()).map(String::as_str)
    }

    /// Returns the trimmed value of an attribute when it is present and not blank.
    pub fn non_empty(&self, name: &str) -> Option<&str> {
        self.get(name)
            .map(str::trim)
            .filter(|value| !value.is_empty())
    }
}

fn next_attribute(text: &str) -> Option<(&str, &str, &str)> {
    let equals = text.find("=\"")?;
    let name_start = text[..equals]
        .rfind(|character: char| character.is_whitespace() || character == '<')
        .map_or(0, |position| position + 1);
    let value_start = equals + 2;
    let value_length = text[value_start..].find('"')?;
    let value_end = value_start + value_length;
    Some((
        text[name_start..equals].trim(),
        &text[value_start..value_end],
        &text[value_end + 1..],
    ))
}

fn unescape(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut rest = value;
    while let Some(start) = rest.find('&') {
        output.push_str(&rest[..start]);
        match entity_at(rest, start) {
            Some((character, end)) => {
                output.push(character);
                rest = &rest[end + 1..];
            }
            None => {
                output.push('&');
                rest = &rest[start + 1..];
            }
        }
    }
    output.push_str(rest);
    output
}

/// Decodes the entity whose `&` is at `start`, returning its character and the position of its `;`.
fn entity_at(text: &str, start: usize) -> Option<(char, usize)> {
    let end = start + text[start..].find(';')?;
    Some((decode_entity(&text[start + 1..end])?, end))
}

fn decode_entity(name: &str) -> Option<char> {
    match name {
        "lt" => Some('<'),
        "gt" => Some('>'),
        "amp" => Some('&'),
        "quot" => Some('"'),
        "apos" => Some('\''),
        _ => decode_numeric_entity(name.strip_prefix('#')?),
    }
}

fn decode_numeric_entity(digits: &str) -> Option<char> {
    let code = match digits.strip_prefix(['x', 'X']) {
        Some(hex) => u32::from_str_radix(hex, 16).ok()?,
        None => digits.parse().ok()?,
    };
    char::from_u32(code)
}

#[cfg(test)]
mod tests {
    use super::*;

    const ELEMENT: &str = "<Dictionary GeneratedByEngineVersion=\"2.0\" Title=\"Cats &amp; Dogs\" StyleSheet=\"1\r\n<b>\r\n</b>\" Description=\"&lt;p&gt;&#x41;&#66;\"/>";

    fn attributes() -> HeaderAttributes {
        HeaderAttributes::parse(ELEMENT)
    }

    #[test]
    fn reads_an_attribute_ignoring_the_case_of_its_name() {
        assert_eq!(attributes().get("generatedbyengineversion"), Some("2.0"));
    }

    #[test]
    fn unescapes_named_entities() {
        assert_eq!(attributes().get("Title"), Some("Cats & Dogs"));
    }

    #[test]
    fn unescapes_numeric_entities() {
        assert_eq!(attributes().get("Description"), Some("<p>AB"));
    }

    #[test]
    fn keeps_raw_line_breaks_in_values() {
        assert_eq!(attributes().get("StyleSheet"), Some("1\r\n<b>\r\n</b>"));
    }

    #[test]
    fn keeps_an_ampersand_that_starts_no_entity() {
        assert_eq!(unescape("salt & pepper"), "salt & pepper");
    }

    #[test]
    fn treats_a_blank_value_as_absent() {
        let attributes = HeaderAttributes::parse("<Dictionary Title=\"  \"/>");
        assert_eq!(attributes.non_empty("Title"), None);
    }
}
