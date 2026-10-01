import { describe, expect, it } from "vitest";
import type { RootState } from "./createAppStore.ts";
import {
  selectChosenFile,
  selectCurrentTimeMs,
  selectFlashcardEditor,
  selectHasScreenshotField,
  selectLookup,
  selectPendingFilePick,
  selectPlayer,
  selectPreference,
  selectScreen,
  selectSubtitles,
} from "./selectors.ts";
import { createAppState } from "./testSupport/createAppState.ts";
import { createEditingFlashcardEditor } from "./testSupport/createEditingFlashcardEditor.ts";
import { createNewFlashcard } from "./testSupport/createNewFlashcard.ts";

const chosenFile = {
  purpose: { kind: "dictionary" },
  file: { name: "jmdict.zip", source: { kind: "path", path: "/jmdict.zip" } },
} as const;

const rootState: RootState = {
  app: createAppState(
    { currentTimeMs: 4000 },
    {
      screen: { kind: "project", projectId: "p1" },
      preferences: { showTranslations: "true" },
      pendingFilePick: { kind: "media" },
      chosenFile,
    },
  ),
};

describe("selectors", () => {
  it("selectScreen returns the current screen", () => {
    expect(selectScreen(rootState)).toEqual({
      kind: "project",
      projectId: "p1",
    });
  });

  it("selectPlayer returns the player state", () => {
    expect(selectPlayer(rootState)).toBe(rootState.app.player);
  });

  it("selectCurrentTimeMs returns the player's current time", () => {
    expect(selectCurrentTimeMs(rootState)).toBe(4000);
  });

  it("selectSubtitles returns the subtitles state", () => {
    expect(selectSubtitles(rootState)).toBe(rootState.app.subtitles);
  });

  it("selectLookup returns the lookup state", () => {
    expect(selectLookup(rootState)).toEqual({ kind: "closed" });
  });

  it("selectFlashcardEditor returns the flashcard editor state", () => {
    expect(selectFlashcardEditor(rootState)).toEqual({ kind: "closed" });
  });

  it("selectHasScreenshotField returns false while the editor is closed", () => {
    expect(selectHasScreenshotField(rootState)).toBe(false);
  });

  it("selectHasScreenshotField returns true when the edited card has a screenshot field", () => {
    const card = createNewFlashcard({
      fields: [{ kind: "screenshot", value: "" }],
    });
    const editing: RootState = {
      app: createAppState(
        {},
        { flashcardEditor: createEditingFlashcardEditor(card) },
      ),
    };
    expect(selectHasScreenshotField(editing)).toBe(true);
  });

  it("selectPendingFilePick returns the purpose of the pending file pick", () => {
    expect(selectPendingFilePick(rootState)).toEqual({ kind: "media" });
  });

  it("selectChosenFile returns the chosen file", () => {
    expect(selectChosenFile(rootState)).toEqual(chosenFile);
  });

  it("selectPreference returns the stored preference value", () => {
    expect(selectPreference("showTranslations")(rootState)).toBe("true");
  });
});
