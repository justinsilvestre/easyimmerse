/// The column layout of term and kanji bank rows, which changed after the first format version.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RowLayout {
    /// Format 1: definitions or meanings follow the fixed columns as extra items.
    Original,
    /// Formats 2 and 3: definitions or meanings sit in one array column, followed by more columns.
    Current,
}
