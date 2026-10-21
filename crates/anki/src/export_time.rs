/// When a package is written, and the UTC offset of the user it is written for,
/// which places the 4 a.m. day boundaries that review cards fall due on, as easyImmerse's review places them.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ExportTime {
    /// Milliseconds since the Unix epoch.
    pub at_ms: u64,
    /// Local time minus UTC, in minutes.
    pub utc_offset_min: i32,
}
