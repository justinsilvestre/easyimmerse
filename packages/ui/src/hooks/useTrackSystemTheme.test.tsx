import { selectTheme } from "@easyimmerse/state";
import { act, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeMediaQueryList } from "../testSupport/createFakeMediaQueryList.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { useTrackSystemTheme } from "./useTrackSystemTheme.ts";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function SystemThemeProbe() {
  useTrackSystemTheme();
  return null;
}

function renderTracker(prefersDark: boolean) {
  const query = createFakeMediaQueryList(prefersDark);
  vi.spyOn(window, "matchMedia").mockReturnValue(query);
  const { store } = renderWithAppStore(<SystemThemeProbe />);
  return { query, store };
}

describe("useTrackSystemTheme", () => {
  it("takes the system theme on mount", () => {
    const { store } = renderTracker(true);
    expect(selectTheme(store.getState())).toBe("dark");
  });

  it("follows the system theme when it changes", () => {
    const { query, store } = renderTracker(true);
    act(() => query.changeMatch(false));
    expect(selectTheme(store.getState())).toBe("light");
  });

  it("stops listening on unmount", () => {
    const { query } = renderTracker(true);
    cleanup();
    expect(query.countListeners()).toBe(0);
  });
});
