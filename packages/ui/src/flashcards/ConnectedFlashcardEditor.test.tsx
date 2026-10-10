import { actions } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ConnectedFlashcardEditor } from "./ConnectedFlashcardEditor.tsx";
import { exampleFlashcard, exampleLanguages } from "./exampleFlashcard.ts";

afterEach(cleanup);

/** Renders the editor on the media screen, with a new card for a clip from one to two seconds open in it when `isOpen` says so. */
function renderEditor(isOpen = true) {
  const rendered = renderWithAppStore(
    <ConnectedFlashcardEditor languages={exampleLanguages} />,
    createFakeBackendClient({}),
  );
  act(() => {
    rendered.store.dispatch(actions.openMediaFileRequested("p1", "m1"));
    if (!isOpen) return;
    rendered.store.dispatch(
      actions.flashcardStarted(
        {
          id: "f1",
          draft: {
            media_file_id: "m1",
            cue_index: null,
            word_start: null,
            content: {
              ...exampleFlashcard,
              audio_context: { start_ms: 1_000, end_ms: 2_000 },
            },
            included_fields: ["word", "audio_context"],
          },
        },
        "editor",
      ),
    );
  });
  return rendered;
}

describe("ConnectedFlashcardEditor", () => {
  it("shows the card open in the form", () => {
    renderEditor();
    expect(screen.queryByRole("form", { name: "Flashcard" })).not.toBeNull();
  });

  it("shows nothing while no card is open", () => {
    renderEditor(false);
    expect(screen.queryByRole("form", { name: "Flashcard" })).toBeNull();
  });

  it("plays the clip on the player from its start", () => {
    const { effects } = renderEditor();
    const callsBefore = effects.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Play the clip" }));
    expect(
      effects.calls
        .slice(callsBefore)
        .filter((call) => call.type.endsWith("Player")),
    ).toEqual([{ type: "seekPlayer", seconds: 1 }, { type: "playPlayer" }]);
  });
});
