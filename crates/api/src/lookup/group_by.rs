use std::collections::HashMap;
use std::hash::Hash;

/// Groups the values by key, keeping their order within each group.
pub fn group_by<T, K: Eq + Hash>(
    values: impl IntoIterator<Item = T>,
    key: impl Fn(&T) -> K,
) -> HashMap<K, Vec<T>> {
    let mut groups: HashMap<K, Vec<T>> = HashMap::new();
    for value in values {
        groups.entry(key(&value)).or_default().push(value);
    }
    groups
}
