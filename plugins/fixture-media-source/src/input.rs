use crate::easyimmerse::plugin::types::FormInput;

/// The values the user entered in the field `field`, or none when the input lacks it.
pub fn values_of(input: &[FormInput], field: &str) -> Vec<String> {
    input
        .iter()
        .find(|entry| entry.field == field)
        .map(|entry| entry.values.clone())
        .unwrap_or_default()
}
