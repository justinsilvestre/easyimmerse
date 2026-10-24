import { type AppStore, actions, selectRoute } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleFlashcard } from "../components/flashcards/exampleFlashcard.ts";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { AppFooter } from "./AppFooter.tsx";

afterEach(cleanup);

/** Renders the footer, with the screen's own buttons if any. */
function renderFooter({ children }: { children?: ReactNode } = {}) {
  return renderWithAppStore(<AppFooter>{children}</AppFooter>);
}

/** The names of the footer's buttons, in order. */
const buttonNames = () =>
  screen
    .getAllByRole("button")
    .map((button) => button.getAttribute("aria-label") ?? button.textContent);

describe("AppFooter", () => {
  it("shows no Settings button", () => {
    renderFooter();
    expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
  });

  it("shows no theme menu", () => {
    renderFooter();
    expect(screen.queryByRole("button", { name: /^Theme/ })).toBeNull();
  });

  it("shows the Sync button first", () => {
    renderFooter();
    expect(buttonNames()[0]).toBe("Saved only in this browser");
  });

  describe("with a screen's own buttons", () => {
    const pinButton = <button type="button">Pin</button>;

    it("keeps the Sync button first", () => {
      renderFooter({ children: pinButton });
      expect(buttonNames()[0]).toBe("Saved only in this browser");
    });

    it("places them last", () => {
      renderFooter({ children: pinButton });
      expect(buttonNames().at(-1)).toBe("Pin");
    });
  });

  describe("while a dictionary is being added", () => {
    /** Starts adding a file on the dictionaries page, then closes Settings. */
    function leaveRunningImport(store: AppStore) {
      act(() => {
        store.dispatch(actions.navigated({ type: "openDictionaries" }));
        store.dispatch(
          actions.dictionaryFileChosen({
            name: "jmdict.zip",
            source: { kind: "path", path: "/d/jmdict.zip" },
          }),
        );
        store.dispatch(actions.navigated({ type: "closeSettings" }));
      });
    }

    it("tells of the import", () => {
      const { store } = renderFooter();
      leaveRunningImport(store);
      expect(screen.getByText("Adding jmdict.zip")).toBeDefined();
    });

    it("names the import's status by its text alone", () => {
      const { store } = renderFooter();
      leaveRunningImport(store);
      expect(
        screen.getByRole("button", { name: "Adding jmdict.zip" }),
      ).toBeDefined();
    });

    it("shows no import's status while the dictionaries page is on top", () => {
      const { store } = renderFooter();
      leaveRunningImport(store);
      act(() => {
        store.dispatch(actions.navigated({ type: "openDictionaries" }));
      });
      expect(screen.queryByText("Adding jmdict.zip")).toBeNull();
    });

    it("opens the dictionaries page from the import's status", () => {
      const { store } = renderFooter();
      leaveRunningImport(store);
      fireEvent.click(screen.getByText("Adding jmdict.zip"));
      expect(selectRoute(store.getState())).toMatchObject({
        screen: "settings",
        pages: ["dictionaries"],
      });
    });
  });

  describe("while a flashcard save waits on the server", () => {
    /** Renders the footer over m1 with a server that never answers a save, saves a flashcard, and lets its save go slow. */
    function renderSlowSave() {
      const client = createFakeBackendClient({
        ...fixtureResponses,
        "POST /projects/p1/flashcards": () => new Promise(() => {}),
      });
      const { store } = renderWithAppStore(<AppFooter />, client);
      act(() => {
        store.dispatch(actions.openMediaFileRequested("p1", "m1"));
        store.dispatch(
          actions.flashcardStarted(
            {
              id: "id-fressen",
              draft: {
                media_file_id: "m1",
                cue_index: 1,
                word_start: null,
                content: { ...exampleFlashcard, word: "fressen" },
                included_fields: ["word"],
              },
            },
            "save",
          ),
        );
      });
      const save = store
        .getState()
        .app.operations.requests.find(
          ({ request }) => request.kind === "saveFlashcard",
        );
      act(() => {
        if (save) store.dispatch(actions.requestWentSlow(save.id));
      });
    }

    it("tells that the flashcard is being saved", () => {
      renderSlowSave();
      expect(screen.getByText("Saving 1 flashcard…")).toBeDefined();
    });

    it("offers no button for the saves, which have no place to show", () => {
      renderSlowSave();
      expect(
        screen.queryByRole("button", { name: "Saving 1 flashcard…" }),
      ).toBeNull();
    });
  });
});
