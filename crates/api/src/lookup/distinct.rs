use std::collections::HashSet;
use std::hash::Hash;

/// Keeps the first of each equal value, in order.
pub fn distinct<T: Clone + Eq + Hash>(values: impl IntoIterator<Item = T>) -> Vec<T> {
    let mut seen = HashSet::new();
    (values.into_iter())
        .filter(|value| seen.insert(value.clone()))
        .collect()
}
