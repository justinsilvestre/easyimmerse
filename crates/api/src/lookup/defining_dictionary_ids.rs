use easyimmerse_core::lookup::LookupResult;

/// Lists the dictionaries whose definitions appear in the results, each once, in sorted order.
pub fn defining_dictionary_ids<'a>(
    results: impl IntoIterator<Item = &'a LookupResult>,
) -> Vec<String> {
    let mut ids: Vec<String> = (results.into_iter())
        .flat_map(|result| &result.definitions)
        .map(|definitions| definitions.dictionary_id.clone())
        .collect();
    ids.sort();
    ids.dedup();
    ids
}
