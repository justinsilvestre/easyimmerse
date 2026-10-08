import { actions } from "@easyimmerse/state";
import { act, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { useApplyTheme } from "./useApplyTheme.ts";

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.themeTransitions;
});

function ThemeProbe() {
  useApplyTheme();
  return null;
}

describe("useApplyTheme", () => {
  it("marks the document with the theme to show", () => {
    const { store } = renderWithAppStore(<ThemeProbe />);
    act(() => {
      store.dispatch(actions.preferenceSet("theme", "dark"));
    });
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("leaves theme transitions off for the first theme", () => {
    renderWithAppStore(<ThemeProbe />);
    expect(document.documentElement.dataset.themeTransitions).toBeUndefined();
  });

  it("turns theme transitions on once the first theme is painted", async () => {
    renderWithAppStore(<ThemeProbe />);
    await vi.waitFor(() => {
      expect(document.documentElement.dataset.themeTransitions).toBe("");
    });
  });
});
