/// Scheduling of an exported card. Only `New` exists until the built-in review ships.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CardScheduling {
    New,
}

/// The scheduling columns of a row in the `cards` table.
pub(crate) struct CardColumns {
    pub(crate) kind: i64,
    pub(crate) queue: i64,
    pub(crate) due: i64,
    pub(crate) interval: i64,
    pub(crate) factor: i64,
    pub(crate) reps: i64,
    pub(crate) lapses: i64,
    pub(crate) left: i64,
    pub(crate) data: &'static str,
}

impl CardScheduling {
    /// The columns of a card at `position`, counted from 1 in export order, which is the order Anki shows new cards in.
    pub(crate) fn columns(self, position: i64) -> CardColumns {
        match self {
            CardScheduling::New => CardColumns {
                kind: 0,
                queue: 0,
                due: position,
                interval: 0,
                factor: 0,
                reps: 0,
                lapses: 0,
                left: 0,
                data: "{}",
            },
        }
    }
}
