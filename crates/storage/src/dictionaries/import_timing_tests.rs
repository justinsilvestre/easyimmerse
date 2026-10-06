//! Times the import of a real dictionary file, for profiling.
//!
//! Run with `EASYIMMERSE_IMPORT_TIMING_FILE=<path> cargo test -p easyimmerse-storage --lib import_timing -- --ignored --nocapture`.

use std::path::PathBuf;
use std::time::Instant;

use easyimmerse_core::dictionary::DictionarySource;

use crate::Storage;

const FILE_VARIABLE: &str = "EASYIMMERSE_IMPORT_TIMING_FILE";

#[test]
#[ignore = "imports the file named by EASYIMMERSE_IMPORT_TIMING_FILE"]
fn imports_the_named_file() {
    let path = PathBuf::from(std::env::var(FILE_VARIABLE).expect(FILE_VARIABLE));
    let name = path.file_name().unwrap().to_string_lossy().into_owned();
    let mut source = DictionarySource::single(name, std::fs::read(&path).unwrap()).unwrap();
    let directory = tempfile::tempdir().unwrap();
    let storage = Storage::open(&directory.path().join("timing.sqlite")).unwrap();
    let started = Instant::now();
    let id = storage.import_dictionary(&mut source).unwrap();
    let counts = storage.get_dictionary(&id).unwrap().counts;
    eprintln!("imported {counts:?} in {:.1?}", started.elapsed());
}
