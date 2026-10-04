//! Gathering the files of a dictionary from the server's own file system.

use std::fs;
use std::io;
use std::path::Path;

use easyimmerse_core::dictionary::SourceFile;

/// Extensions that dictionary files carry, possibly several in a row as in `name.dict.dz` or `name.1.mdd`.
const DICTIONARY_EXTENSIONS: &[&str] = &[
    "css", "csv", "dict", "dz", "gz", "idx", "ifo", "json", "mdd", "mdx", "syn", "tar", "tsv",
    "txt", "zip",
];

/// The directory beside a StarDict or MDict dictionary that holds its images and sounds.
const RESOURCE_DIRECTORY: &str = "res";

/// Reads the files of the dictionary at `path`.
///
/// For a directory, every file beneath it, named by its path relative to the directory.
/// For a file, the file and its siblings that share its stem, such as `name.ifo`, `name.idx` and `name.dict.dz`,
/// together with the files of a sibling `res` directory.
/// Hidden files are skipped.
pub fn read_dictionary_files(path: &Path) -> io::Result<Vec<SourceFile>> {
    let mut files = Vec::new();
    if fs::metadata(path)?.is_dir() {
        read_directory(path, path, &mut files)?;
    } else {
        read_file_set(path, &mut files)?;
    }
    Ok(files)
}

/// Strips the dictionary extensions from the end of a file name: `name.dict.dz` and `name.1.mdd` both give `name`.
pub fn dictionary_stem(file_name: &str) -> &str {
    let mut stem = file_name;
    while let Some((rest, extension)) = stem.rsplit_once('.') {
        if rest.is_empty() || !is_dictionary_extension(extension) {
            break;
        }
        stem = rest;
    }
    stem
}

fn is_dictionary_extension(extension: &str) -> bool {
    let extension = extension.to_ascii_lowercase();
    DICTIONARY_EXTENSIONS.contains(&extension.as_str())
        || extension
            .chars()
            .all(|character| character.is_ascii_digit())
}

fn read_file_set(path: &Path, files: &mut Vec<SourceFile>) -> io::Result<()> {
    let directory = path.parent().unwrap_or(Path::new("."));
    let stem = dictionary_stem(&file_name(path)).to_string();
    for sibling in sorted_entries(directory)? {
        let name = file_name(&sibling);
        if sibling.is_file() && dictionary_stem(&name) == stem {
            files.push(read_source_file(&sibling, name)?);
        }
    }
    let resources = directory.join(RESOURCE_DIRECTORY);
    if resources.is_dir() {
        read_directory(directory, &resources, files)?;
    }
    Ok(())
}

fn read_directory(root: &Path, directory: &Path, files: &mut Vec<SourceFile>) -> io::Result<()> {
    for path in sorted_entries(directory)? {
        if path.is_dir() {
            read_directory(root, &path, files)?;
        } else {
            files.push(read_source_file(&path, relative_name(root, &path))?);
        }
    }
    Ok(())
}

/// Lists the entries of a directory by name, leaving out hidden ones.
fn sorted_entries(directory: &Path) -> io::Result<Vec<std::path::PathBuf>> {
    let mut paths: Vec<_> = fs::read_dir(directory)?
        .map(|entry| entry.map(|entry| entry.path()))
        .collect::<io::Result<_>>()?;
    paths.retain(|path| !file_name(path).starts_with('.'));
    paths.sort();
    Ok(paths)
}

fn read_source_file(path: &Path, name: String) -> io::Result<SourceFile> {
    Ok(SourceFile {
        name,
        bytes: fs::read(path)?,
    })
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default()
}

fn relative_name(root: &Path, path: &Path) -> String {
    let relative = path.strip_prefix(root).unwrap_or(path);
    let components: Vec<String> = relative
        .components()
        .map(|component| component.as_os_str().to_string_lossy().into_owned())
        .collect();
    components.join("/")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write(directory: &Path, name: &str) {
        let path = directory.join(name);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, name.as_bytes()).unwrap();
    }

    fn names(files: Vec<SourceFile>) -> Vec<String> {
        files.into_iter().map(|file| file.name).collect()
    }

    #[test]
    fn strips_a_compound_stardict_extension() {
        assert_eq!(dictionary_stem("jmdict.dict.dz"), "jmdict");
    }

    #[test]
    fn strips_a_numbered_mdict_volume() {
        assert_eq!(dictionary_stem("oxford.1.mdd"), "oxford");
    }

    #[test]
    fn keeps_dots_that_belong_to_the_name() {
        assert_eq!(dictionary_stem("Oxford.Advanced.mdx"), "Oxford.Advanced");
    }

    #[test]
    fn gathers_the_siblings_that_share_a_stem() {
        let directory = tempfile::tempdir().unwrap();
        for name in ["d.ifo", "d.idx.gz", "d.dict.dz", "other.ifo", "notes.md"] {
            write(directory.path(), name);
        }
        let files = read_dictionary_files(&directory.path().join("d.ifo")).unwrap();
        assert_eq!(names(files), vec!["d.dict.dz", "d.idx.gz", "d.ifo"]);
    }

    #[test]
    fn gathers_a_sibling_resource_directory() {
        let directory = tempfile::tempdir().unwrap();
        write(directory.path(), "d.mdx");
        write(directory.path(), "res/img/a.png");
        let files = read_dictionary_files(&directory.path().join("d.mdx")).unwrap();
        assert_eq!(names(files), vec!["d.mdx", "res/img/a.png"]);
    }

    #[test]
    fn gathers_every_file_beneath_a_directory() {
        let directory = tempfile::tempdir().unwrap();
        for name in ["a.csv", "sub/b.png", ".DS_Store"] {
            write(directory.path(), name);
        }
        let files = read_dictionary_files(directory.path()).unwrap();
        assert_eq!(names(files), vec!["a.csv", "sub/b.png"]);
    }

    #[test]
    fn reports_a_missing_path() {
        let error = read_dictionary_files(Path::new("/no/such/dictionary.ifo")).unwrap_err();
        assert_eq!(error.kind(), io::ErrorKind::NotFound);
    }
}
