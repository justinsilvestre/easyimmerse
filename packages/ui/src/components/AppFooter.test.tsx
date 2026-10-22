import {
  type AppStore,
  actions,
  selectIsPairingOpen,
  selectRoute,
} from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { AppFooter } from "./AppFooter.tsx";

afterEach(cleanup);

/** Renders the footer, with Settings open when `isSettingsOpen`, and counts the actions dispatched from then on. */
function renderFooter({
  isSettingsOpen = false,
  children,
}: {
  isSettingsOpen?: boolean;
  children?: ReactNode;
} = {}) {
  const { store } = renderWithAppStore(<AppFooter>{children}</AppFooter>);
  if (isSettingsOpen)
    act(() => {
      store.dispatch(actions.navigated({ type: "openSettings" }));
    });
  const dispatched = vi.fn();
  store.subscribe(dispatched);
  return { store, dispatched };
}

describe("AppFooter", () => {
  it("shows no Settings text link", () => {
    renderFooter();
    expect(screen.queryByText("Settings")).toBeNull();
  });

  it("opens Settings from the gear button", () => {
    const { store } = renderFooter();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(selectRoute(store.getState()).screen).toBe("settings");
  });

  it("opens the local network sync page from its button", () => {
    const { store } = renderFooter();
    fireEvent.click(screen.getByRole("button", { name: "Local network sync" }));
    expect(selectIsPairingOpen(store.getState())).toBe(true);
  });

  it("shows the theme menu", () => {
    renderFooter();
    expect(screen.getByRole("button", { name: /^Theme:/ })).toBeDefined();
  });

  describe("with a screen's own buttons", () => {
    const pinButton = <button type="button">Pin</button>;

    it("keeps the gear button", () => {
      renderFooter({ children: pinButton });
      expect(screen.getByRole("button", { name: "Settings" })).toBeDefined();
    });

    it("keeps the theme menu", () => {
      renderFooter({ children: pinButton });
      expect(screen.getByRole("button", { name: /^Theme:/ })).toBeDefined();
    });

    it("places them after the gear button and the theme menu", () => {
      renderFooter({ children: pinButton });
      const buttonNames = screen
        .getAllByRole("button")
        .map(
          (button) => button.getAttribute("aria-label") ?? button.textContent,
        );
      expect(buttonNames.at(-1)).toBe("Pin");
    });
  });

  describe("while Settings is open", () => {
    it("marks the gear button as the current page", () => {
      renderFooter({ isSettingsOpen: true });
      expect(
        screen
          .getByRole("button", { name: "Settings" })
          .getAttribute("aria-current"),
      ).toBe("page");
    });

    it("does nothing when the gear button is clicked", () => {
      const { dispatched } = renderFooter({ isSettingsOpen: true });
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(dispatched).not.toHaveBeenCalled();
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
