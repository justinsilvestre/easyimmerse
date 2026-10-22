//! The files of the media copies a server keeps in its uploads directory, and how many bytes each principal may keep.

use std::path::{Path, PathBuf};
use std::time::Duration;

use easyimmerse_core::account::AccountRole;
use easyimmerse_core::media_file::{MediaFile, MediaFileSource};
use easyimmerse_storage::Storage;

use crate::auth::principal::Principal;
use crate::config::UploadsConfig;
use crate::state::AppState;

/// How often the server deletes the files of copies that are gone, such as those of a deleted project.
pub const RELEASE_INTERVAL: Duration = Duration::from_secs(60);

/// The most bytes the principal may keep in copies; None for no limit.
/// The holder of the launch token has none; privileged accounts and administrators have the account quota,
/// and library users theirs.
pub fn quota_of(uploads: &UploadsConfig, principal: &Principal) -> Option<u64> {
    match principal {
        Principal::Launch => None,
        Principal::Account { role, .. } => match role {
            AccountRole::LibraryUser => Some(uploads.library_user_quota_bytes),
            AccountRole::Privileged | AccountRole::Administrator => uploads.account_quota_bytes,
        },
    }
}

/// A new file name for a copy of the media file, keeping the original's extension so that its type can be told.
/// The name holds only ASCII letters, digits, `-`, `_` and the dot before the extension,
/// so it stays inside the uploads directory whatever id a device gave the media file.
pub fn copy_file_name(media_file: &MediaFile) -> String {
    let original = match &media_file.source {
        MediaFileSource::Path { path } => path.as_str(),
        MediaFileSource::BrowserFile { .. } => media_file.name.as_str(),
    };
    let random = hex::encode(rand::random::<[u8; 8]>());
    let id = plain_part_of(&media_file.id.0);
    let stem = if id.is_empty() {
        random
    } else {
        format!("{id}-{random}")
    };
    match extension_of(original) {
        Some(extension) => format!("{stem}.{extension}"),
        None => stem,
    }
}

fn plain_part_of(id: &str) -> String {
    id.chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect()
}

fn extension_of(name: &str) -> Option<String> {
    let extension = Path::new(name).extension()?.to_str()?;
    let is_plain = extension.len() <= 8 && extension.chars().all(|c| c.is_ascii_alphanumeric());
    is_plain.then(|| extension.to_ascii_lowercase())
}

/// Deletes the files of the copies that are gone, blocking. A file already missing counts as deleted.
pub fn release_copy_files(storage: &Storage, dir: &Path) {
    let names = match storage.take_released_copy_files() {
        Ok(names) => names,
        Err(error) => {
            tracing::warn!("the released media copies could not be listed: {error}");
            return;
        }
    };
    for name in names {
        let path: PathBuf = dir.join(&name);
        match std::fs::remove_file(&path) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => tracing::warn!("the media copy {name} could not be deleted: {error}"),
        }
    }
}

/// Deletes the files of the copies that are gone, on the blocking pool.
pub async fn release_copies(state: &AppState) {
    let Some(uploads) = state.config.uploads.clone() else {
        return;
    };
    let storage = state.storage.clone();
    let _ = tokio::task::spawn_blocking(move || release_copy_files(&storage, &uploads.dir)).await;
}

/// Deletes released copies' files now and then, for the copies that went with a deleted media file, project or account.
pub async fn release_copies_periodically(state: AppState) {
    loop {
        tokio::time::sleep(RELEASE_INTERVAL).await;
        release_copies(&state).await;
    }
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::media_file::MediaFileId;
    use easyimmerse_core::project::ProjectId;

    use super::*;

    fn uploads() -> UploadsConfig {
        UploadsConfig {
            dir: PathBuf::from("uploads"),
            account_quota_bytes: Some(100),
            library_user_quota_bytes: 5,
        }
    }

    fn account(role: AccountRole) -> Principal {
        Principal::Account {
            user_id: "u".to_string(),
            role,
            session_id: "s".to_string(),
        }
    }

    fn media_file(source: MediaFileSource) -> MediaFile {
        media_file_with_id("m", source)
    }

    fn media_file_with_id(id: &str, source: MediaFileSource) -> MediaFile {
        MediaFile {
            id: MediaFileId(id.to_string()),
            project_id: ProjectId("p".to_string()),
            name: "Film.MKV".to_string(),
            source,
            origin: None,
            created_at_ms: 0,
            track_selection_json: None,
            translation_media_file_id: None,
            is_upload_chosen: true,
            has_stored_copy: false,
        }
    }

    #[test]
    fn the_launch_principal_has_no_quota() {
        assert_eq!(quota_of(&uploads(), &Principal::Launch), None);
    }

    #[test]
    fn a_library_user_has_the_library_user_quota() {
        assert_eq!(
            quota_of(&uploads(), &account(AccountRole::LibraryUser)),
            Some(5)
        );
    }

    #[test]
    fn a_privileged_account_has_the_account_quota() {
        assert_eq!(
            quota_of(&uploads(), &account(AccountRole::Privileged)),
            Some(100)
        );
    }

    #[test]
    fn an_administrator_has_the_account_quota() {
        assert_eq!(
            quota_of(&uploads(), &account(AccountRole::Administrator)),
            Some(100)
        );
    }

    #[test]
    fn a_copy_of_a_browser_file_keeps_the_extension_of_its_name() {
        let name = copy_file_name(&media_file(MediaFileSource::BrowserFile {
            size: 1,
            last_modified_ms: 0,
        }));
        assert!(name.ends_with(".mkv"), "{name}");
    }

    #[test]
    fn a_copy_of_a_path_keeps_the_extension_of_the_path() {
        let name = copy_file_name(&media_file(MediaFileSource::Path {
            path: "/films/a.mp4".to_string(),
        }));
        assert!(name.ends_with(".mp4"), "{name}");
    }

    #[test]
    fn a_copy_leaves_out_an_extension_that_is_not_plain() {
        let name = copy_file_name(&media_file(MediaFileSource::Path {
            path: "/films/a.m p4".to_string(),
        }));
        assert!(!name.contains('.'), "{name}");
    }

    #[test]
    fn a_copy_of_a_media_file_whose_id_climbs_out_has_no_separator() {
        let name = copy_file_name(&media_file_with_id(
            "../../etc/x",
            MediaFileSource::Path {
                path: "/films/a.mp4".to_string(),
            },
        ));
        assert!(!name.contains('/') && !name.contains(".."), "{name}");
    }

    #[test]
    fn a_copy_of_a_media_file_whose_id_has_no_plain_character_is_named_by_the_random_part() {
        let name = copy_file_name(&media_file_with_id(
            "../..",
            MediaFileSource::Path {
                path: "/films/a".to_string(),
            },
        ));
        assert_eq!(name.len(), 16, "{name}");
    }
}
