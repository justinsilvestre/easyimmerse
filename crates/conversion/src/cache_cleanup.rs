//! Finding unfinished output and cache entries that are no longer needed.

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use crate::cache_trash::Removal;
use crate::entry_paths::is_temporary;
use crate::stored_entry::{StoredEntry, list_stored_entries};

/// Finds unfinished output, unreadable entries, and the entries whose source is not among `known_sources`.
pub fn find_unneeded(
    cache_dir: &Path,
    known_sources: &HashSet<PathBuf>,
) -> std::io::Result<Vec<Removal>> {
    let mut removals = Vec::new();
    for entry in list_stored_entries(cache_dir)? {
        let paths = if is_source_known(&entry, known_sources) {
            find_temporary_items(&entry.path)?
        } else {
            vec![entry.path]
        };
        if !paths.is_empty() {
            removals.push(Removal {
                key: entry.key,
                paths,
            });
        }
    }
    Ok(removals)
}

/// Finds every entry that converts `source`.
pub fn find_entries_of_source(cache_dir: &Path, source: &Path) -> std::io::Result<Vec<Removal>> {
    let entries = list_stored_entries(cache_dir)?.into_iter().filter(|entry| {
        let manifest = entry.manifest.as_ref();
        manifest.is_some_and(|manifest| manifest.source_path == source)
    });
    let removals = entries.map(|entry| Removal {
        key: entry.key,
        paths: vec![entry.path],
    });
    Ok(removals.collect())
}

fn is_source_known(entry: &StoredEntry, known_sources: &HashSet<PathBuf>) -> bool {
    let manifest = entry.manifest.as_ref();
    manifest.is_some_and(|manifest| known_sources.contains(&manifest.source_path))
}

fn find_temporary_items(entry_dir: &Path) -> std::io::Result<Vec<PathBuf>> {
    let mut paths = Vec::new();
    for item in std::fs::read_dir(entry_dir)? {
        let item = item?;
        if item.file_name().to_str().is_some_and(is_temporary) {
            paths.push(item.path());
        }
    }
    Ok(paths)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entry_paths::conversions_dir;
    use crate::test_support::{key, manifest, write_entry};

    const SOURCE: &str = "/media/episode.mkv";

    fn known() -> HashSet<PathBuf> {
        HashSet::from([PathBuf::from(SOURCE)])
    }

    fn paths(removals: std::io::Result<Vec<Removal>>) -> Vec<PathBuf> {
        let removals = removals.expect("find removals");
        removals
            .into_iter()
            .flat_map(|removal| removal.paths)
            .collect()
    }

    #[test]
    fn keeps_an_entry_of_a_known_source() {
        let cache = tempfile::tempdir().expect("temp dir");
        write_entry(cache.path(), &key('a'), &manifest(SOURCE), 10);
        assert_eq!(
            paths(find_unneeded(cache.path(), &known())),
            Vec::<PathBuf>::new()
        );
    }

    #[test]
    fn removes_an_entry_of_an_unknown_source() {
        let cache = tempfile::tempdir().expect("temp dir");
        let entry = write_entry(cache.path(), &key('a'), &manifest("/media/gone.mkv"), 10);
        assert_eq!(
            paths(find_unneeded(cache.path(), &known())),
            vec![entry.dir]
        );
    }

    #[test]
    fn names_the_entry_of_a_removal() {
        let cache = tempfile::tempdir().expect("temp dir");
        write_entry(cache.path(), &key('a'), &manifest("/media/gone.mkv"), 10);
        let removals = find_unneeded(cache.path(), &known()).expect("find removals");
        assert_eq!(
            removals.first().and_then(|removal| removal.key.clone()),
            Some(key('a'))
        );
    }

    #[test]
    fn removes_an_entry_without_a_manifest() {
        let cache = tempfile::tempdir().expect("temp dir");
        let entry = write_entry(cache.path(), &key('a'), &manifest(SOURCE), 10);
        std::fs::remove_file(entry.manifest()).expect("remove manifest");
        assert_eq!(
            paths(find_unneeded(cache.path(), &known())),
            vec![entry.dir]
        );
    }

    #[test]
    fn removes_an_item_that_is_not_named_by_a_key() {
        let cache = tempfile::tempdir().expect("temp dir");
        let stray = conversions_dir(cache.path()).join("stray");
        std::fs::create_dir_all(&stray).expect("create stray directory");
        assert_eq!(paths(find_unneeded(cache.path(), &known())), vec![stray]);
    }

    #[test]
    fn removes_run_directories() {
        let cache = tempfile::tempdir().expect("temp dir");
        let entry = write_entry(cache.path(), &key('a'), &manifest(SOURCE), 10);
        std::fs::create_dir(entry.run_dir(2)).expect("create run dir");
        assert_eq!(
            paths(find_unneeded(cache.path(), &known())),
            vec![entry.run_dir(2)]
        );
    }

    #[test]
    fn removes_temporary_files() {
        let cache = tempfile::tempdir().expect("temp dir");
        let entry = write_entry(cache.path(), &key('a'), &manifest(SOURCE), 10);
        let temporary = entry.dir.join("manifest.json.tmp");
        std::fs::write(&temporary, "{").expect("write temporary file");
        assert_eq!(
            paths(find_unneeded(cache.path(), &known())),
            vec![temporary]
        );
    }

    #[test]
    fn finds_nothing_without_a_conversions_directory() {
        let cache = tempfile::tempdir().expect("temp dir");
        assert_eq!(
            paths(find_unneeded(cache.path(), &known())),
            Vec::<PathBuf>::new()
        );
    }

    #[test]
    fn removes_the_entries_of_a_source() {
        let cache = tempfile::tempdir().expect("temp dir");
        let entry = write_entry(cache.path(), &key('a'), &manifest(SOURCE), 10);
        let removals = find_entries_of_source(cache.path(), Path::new(SOURCE));
        assert_eq!(paths(removals), vec![entry.dir]);
    }

    #[test]
    fn keeps_the_entries_of_other_sources() {
        let cache = tempfile::tempdir().expect("temp dir");
        write_entry(cache.path(), &key('a'), &manifest("/media/other.mkv"), 10);
        let removals = find_entries_of_source(cache.path(), Path::new(SOURCE));
        assert_eq!(paths(removals), Vec::<PathBuf>::new());
    }
}
