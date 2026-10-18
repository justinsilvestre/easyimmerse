use easyimmerse_core::flashcard::FlashcardFieldKey;

/// What a project contributes to its deck and note type.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct DeckSpec<'a> {
    pub project_id: &'a str,
    /// The deck's name in Anki. Decks are matched by name on import, so renaming the project makes a second deck.
    pub project_name: &'a str,
    /// Milliseconds since the Unix epoch. It becomes the note type's modification time,
    /// so that importing again never replaces a note type the user has since changed in Anki.
    pub project_created_at_ms: u64,
    /// The fields shown on the front of a card. The other fields go on the back.
    pub front_fields: &'a [FlashcardFieldKey],
}
