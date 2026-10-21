import { actions, type ServerConfig } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppFooter } from "../components/AppFooter.tsx";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";

afterEach(cleanup);

const explanation =
  "Your flashcards aren't backed up. They're stored only in this browser, so you'll lose them if its data is cleared.";

/** Renders the footer and opens a new flashcard with a word typed in, which waits to be saved. */
function renderWithOpenCard(server?: ServerConfig) {
  const rendered = renderWithAppStore(<AppFooter />, undefined, { server });
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

describe("NotBackedUpSign", () => {
  it("shows in the footer while flashcards are kept only in this browser", () => {
    renderWithOpenCard();
    expect(screen.getByRole("button", { name: "Not backed up" })).toBeDefined();
  });

  it("does not show while the app is connected to a server", () => {
    renderWithOpenCard({ serverUrl: "http://127.0.0.1:1", token: "t" });
    expect(screen.queryByRole("button", { name: "Not backed up" })).toBeNull();
  });

  it("explains where the flashcards are kept once pressed", () => {
    renderWithOpenCard();
    fireEvent.click(screen.getByRole("button", { name: "Not backed up" }));
    expect(screen.getByText(explanation)).toBeDefined();
  });

  it("opens the account settings from its menu", () => {
    const { store } = renderWithOpenCard();
    fireEvent.click(screen.getByRole("button", { name: "Not backed up" }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Log in or sign up" }),
    );
    expect(store.getState().app.route).toMatchObject({
      screen: "settings",
      pages: ["general"],
    });
  });
});
