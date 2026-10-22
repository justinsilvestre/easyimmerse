//! Copies of media bytes that a server keeps itself, so that a media file plays on devices that lack the original.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::media_file::MediaFileId;
use crate::project::ProjectId;

/// A copy of a media file's bytes that this server keeps.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct StoredCopy {
    pub media_file_id: MediaFileId,
    pub project_id: ProjectId,
    pub project_name: String,
    /// The media file's name, as its project's media list shows it.
    pub name: String,
    pub size_bytes: u64,
    /// When the copy was stored, in milliseconds since the Unix epoch.
    pub stored_at_ms: u64,
}

/// How much of the principal's upload allowance their stored copies take, and which copies they are.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct StorageStatus {
    /// The most bytes the principal may keep in copies; null when there is no limit.
    pub quota_bytes: Option<u64>,
    pub used_bytes: u64,
    /// The copies, largest first.
    pub copies: Vec<StoredCopy>,
}

/// The person's choice whether to keep a copy of a media file's bytes on a server.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct UploadChoiceRequest {
    pub is_upload_chosen: bool,
}
