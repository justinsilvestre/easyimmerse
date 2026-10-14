/** Which of the chosen media files' flashcards an export includes: those never exported, or all of them. */
export type AnkiExportScope = "new" | "all";

/** The dialog that exports a project's flashcards as an Anki package, open over the project overview. */
export type AnkiExportDialog = {
  scope: AnkiExportScope;
  /** The media files whose flashcards the export includes, or null for every flashcard of the project. */
  mediaFileIds: readonly string[] | null;
  /** True from the press of Export until the package is exported, fails, or the save dialog is cancelled. */
  isBusy: boolean;
};

/** The export dialog as it opens: every new card of the project. */
export const openedAnkiExport: AnkiExportDialog = {
  scope: "new",
  mediaFileIds: null,
  isBusy: false,
};
