import { actions, type ServerConfig } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { exampleFlashcard } from "../exampleFlashcard.ts";

afterEach(cleanup);

const notBackedUp =
  "Your flashcards are not backed up. They are kept only in this browser and are lost when its data is cleared.";

/** Renders the notice region and opens a new flashcard with a word typed in, which waits to be saved. */
function renderWithOpenCard(server?: ServerConfig) {
  const rendered = renderWithAppStore(<p>Screen</p>, undefined, { server });
  act(() => {
    rendered.store.dispatch(actions.openMediaFileRequested("p1", "m1"));
    rendered.store.dispatch(
      actions.flashcardStarted(
        {
          id: "f1",
          draft: {
            media_file_id: "m1",
            cue_index: 1,
            word_start: null,
            content: { ...exampleFlashcard, word: "fressen" },
            included_fields: ["word"],
          },
        },
        "editor",
      ),
    );
    rendered.store.dispatch(
      actions.flashcardEdited({
        type: "textChanged",
        key: "word",
        value: "fraß",
      }),
    );
  });
  return rendered;
}

describe("NotBackedUpStatus", () => {
  it("tells that flashcards are kept only in this browser while the app runs without a server", () => {
    renderWithOpenCard();
    expect(screen.getByText(notBackedUp)).toBeDefined();
  });

  it("tells nothing while the app is connected to a server", () => {
    renderWithOpenCard({ serverUrl: "http://127.0.0.1:1", token: "t" });
    expect(screen.queryByText(notBackedUp)).toBeNull();
  });

  it("opens the account settings from its button", () => {
    const { store } = renderWithOpenCard();
    fireEvent.click(screen.getByRole("button", { name: "Log in or sign up" }));
    expect(store.getState().app.route).toMatchObject({
      screen: "settings",
      pages: ["general"],
    });
  });
});
