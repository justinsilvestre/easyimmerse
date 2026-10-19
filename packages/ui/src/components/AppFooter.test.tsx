import { type AppStore, actions, selectRoute } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
});
