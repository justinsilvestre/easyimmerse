import { resetBackend } from "@easyimmerse/backend";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { PreferenceToggle } from "./PreferenceToggle.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

const findCheckbox = () =>
  screen.getByRole("checkbox", { name: "Show translations" });

describe("PreferenceToggle", () => {
  it("requests the stored preferences on mount", () => {
    const { effects } = renderWithAppStore(<PreferenceToggle />);
    expect(effects.calls).toContainEqual({
      type: "loadPreference",
      key: "showTranslations",
    });
  });

  it("is unchecked before a preference is stored", () => {
    renderWithAppStore(<PreferenceToggle />);
    expect(findCheckbox()).toHaveProperty("checked", false);
  });

  it("saves the preference as true when toggled on", () => {
    const { effects } = renderWithAppStore(<PreferenceToggle />);
    fireEvent.click(findCheckbox());
    expect(effects.preferences.get("showTranslations")).toBe("true");
  });

  it("becomes checked once the loaded preference arrives", async () => {
    const { effects, store } = renderWithAppStore(<PreferenceToggle />);
    effects.preferences.set("showTranslations", "true");
    store.dispatch({ type: "preferencesLoadRequested" });
    await vi.waitFor(() =>
      expect(findCheckbox()).toHaveProperty("checked", true),
    );
  });
});
