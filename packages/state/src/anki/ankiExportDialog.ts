/** Which of the chosen media files' flashcards an export includes: those new or changed since they were last marked as exported, or all of them. */
export type AnkiExportScope = "newAndChanged" | "all";

/** The dialog that exports a project's flashcards as an Anki package, open over the project overview. */
export type AnkiExportDialog = {
  scope: AnkiExportScope;
  /** Whether the export marks its flashcards as exported, so that they no longer count as new or changed. */
  marksExported: boolean;
  /** The media files whose flashcards the export includes, or null for every flashcard of the project. */
  mediaFileIds: readonly string[] | null;
  /** True from the press of Export until the package is exported, fails, or the save dialog is cancelled. */
  isBusy: boolean;
};

/**
 * Returns the export dialog as it opens: every new or changed card of the project, marked as exported
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
