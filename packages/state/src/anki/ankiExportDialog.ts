/** Which of the chosen media files' flashcards an export includes: those in the Anki updates queue, or all of them. */
export type AnkiExportScope = "newAndChanged" | "all";

/** The dialog that exports a project's flashcards as an Anki package, open over the project overview. */
export type AnkiExportDialog = {
  scope: AnkiExportScope;
  /** Whether the export marks its flashcards as exported, which removes them from the Anki updates queue. */
  marksExported: boolean;
  /** The media files whose flashcards the export includes, or null for every flashcard of the project. */
  mediaFileIds: readonly string[] | null;
  /** True from the press of Export until the package is exported, fails, or the save dialog is cancelled. */
  isBusy: boolean;
};

/**
 * Returns the export dialog as it opens: every card of the project in the Anki updates queue, marked as exported
 * unless the project uses AnkiConnect, whose own sends are how its cards usually reach Anki.
 */
export function openedAnkiExport(usesAnkiConnect: boolean): AnkiExportDialog {
  return {
    scope: "newAndChanged",
    marksExported: !usesAnkiConnect,
    mediaFileIds: null,
    isBusy: false,
  };
}
