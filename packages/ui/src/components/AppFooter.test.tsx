import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NavigationActionsContext,
  SettingsOpenContext,
} from "../navigationContext.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { AppFooter } from "./AppFooter.tsx";

afterEach(cleanup);

function renderFooter({ isSettingsOpen = false } = {}) {
  const openSettings = vi.fn();
  renderWithAppStore(
    <NavigationActionsContext
      value={{
        openSettings,
        openDictionaries: () => undefined,
        openMediaFile: () => undefined,
      }}
    >
      <SettingsOpenContext value={isSettingsOpen}>
        <AppFooter />
      </SettingsOpenContext>
    </NavigationActionsContext>,
  );
  return { openSettings };
}

describe("AppFooter", () => {
  it("shows no Settings text link", () => {
    renderFooter();
    expect(screen.queryByText("Settings")).toBeNull();
  });

  it("opens Settings from the gear button", () => {
    const { openSettings } = renderFooter();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(openSettings).toHaveBeenCalledOnce();
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
      const { openSettings } = renderFooter({ isSettingsOpen: true });
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(openSettings).not.toHaveBeenCalled();
    });
  });
});
