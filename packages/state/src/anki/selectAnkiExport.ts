import { createSelector } from "reselect";
import type { RootState } from "../app/createAppStore.ts";
import { mainScreenOf } from "../route/route.ts";
import { cachedFlashcards } from "./ankiCache.ts";
import type { AnkiExportDialog } from "./ankiExportDialog.ts";
import { flashcardIdsToExport } from "./ankiExportSelection.ts";

/** What the Anki export dialog shows: its choices, and how many flashcards each scope exports from the chosen media files. */
export type AnkiExportView = AnkiExportDialog & {
  newCount: number;
  allCount: number;
};

/**
 * Selects the Anki export dialog open over the project overview, or null while it is closed.
 * The result keeps its reference while the dialog and the project's cached flashcards do.
 */
export const selectAnkiExport = createSelector(
  [
    (root: RootState) =>
      root.app.screen.main.kind === "project"
        ? root.app.screen.main.ankiExport
        : null,
    (root: RootState) => {
      const main = mainScreenOf(root.app.route);
      return main.screen === "project"
        ? cachedFlashcards(root.backend, main.projectId)
        : [];
    },
  ],
  (dialog, flashcards): AnkiExportView | null => {
    if (dialog === null) return null;
    const { mediaFileIds } = dialog;
    return {
      ...dialog,
      newCount: flashcardIdsToExport(flashcards, { scope: "new", mediaFileIds })
        .length,
      allCount: flashcardIdsToExport(flashcards, { scope: "all", mediaFileIds })
        .length,
    };
  },
);

/** Tells whether the dialog that explains how to set up AnkiConnect is open over the project overview. */
export const selectIsAnkiConnectSetupOpen = (root: Pick<RootState, "app">) =>
  root.app.screen.main.kind === "project" &&
  root.app.screen.main.isAnkiConnectSetupOpen;
