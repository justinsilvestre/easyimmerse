import { createSelector } from "reselect";
import type { RootState } from "../app/createAppStore.ts";
import { mainScreenOf } from "../route/route.ts";
import { cachedFlashcards, cachedUsesAnkiConnect } from "./ankiCache.ts";
import type { AnkiExportDialog } from "./ankiExportDialog.ts";
import {
  flashcardsToExport,
  wasSentBeforeExport,
} from "./ankiExportSelection.ts";

/** What the Anki export dialog shows: its choices, and how many flashcards each scope exports from the chosen media files. */
export type AnkiExportView = AnkiExportDialog & {
  newAndChangedCount: number;
  allCount: number;
  /** The exported flashcards that AnkiConnect put into Anki before any export marked them, which an import would duplicate there. */
  duplicateCount: number;
  /** Whether the project uses AnkiConnect, which deletes the notes of deleted flashcards from Anki, as no package can. */
  usesAnkiConnect: boolean;
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
    (root: RootState) => {
      const main = mainScreenOf(root.app.route);
      return main.screen === "project"
        ? cachedUsesAnkiConnect(root.backend, main.projectId)
        : false;
    },
  ],
  (dialog, flashcards, usesAnkiConnect): AnkiExportView | null => {
    if (dialog === null) return null;
    const { mediaFileIds } = dialog;
    const countOf = (scope: AnkiExportDialog["scope"]) =>
      flashcardsToExport(flashcards, { scope, mediaFileIds }).length;
    return {
      ...dialog,
      newAndChangedCount: countOf("newAndChanged"),
      allCount: countOf("all"),
      duplicateCount: flashcardsToExport(flashcards, dialog).filter(
        wasSentBeforeExport,
      ).length,
      usesAnkiConnect,
    };
  },
);

/** Tells whether the dialog that explains how to set up AnkiConnect is open over the project overview. */
export const selectIsAnkiConnectSetupOpen = (root: Pick<RootState, "app">) =>
  root.app.screen.main.kind === "project" &&
  root.app.screen.main.isAnkiConnectSetupOpen;
