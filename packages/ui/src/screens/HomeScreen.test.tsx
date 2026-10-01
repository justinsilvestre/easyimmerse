import type { BackendClient } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import { selectScreen } from "@easyimmerse/state";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { HomeScreen } from "./HomeScreen.tsx";

const offlineClient: BackendClient = {
  send: async () => ({ error: { status: "OFFLINE", message: "No server." } }),
};

afterEach(() => {
  cleanup();
  resetBackend();
});

describe("HomeScreen", () => {
  describe("when projects load", () => {
    it("lists each project name", async () => {
      renderWithAppStore(<HomeScreen />);
      await screen.findByRole("button", { name: "Alpha" });
      const list = screen.getByRole("list", { name: "Projects" });
      expect(
        within(list)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["Alpha", "Beta"]);
    });

    it("opens the clicked project", async () => {
      const { store } = renderWithAppStore(<HomeScreen />);
      fireEvent.click(await screen.findByRole("button", { name: "Beta" }));
      expect(selectScreen(store.getState())).toEqual({
        kind: "project",
        projectId: "p2",
      });
    });
  });

  describe("when no server is configured", () => {
    it("offers to continue offline", async () => {
      const { store } = renderWithAppStore(<HomeScreen />, offlineClient);
      fireEvent.click(
        await screen.findByRole("button", { name: "Continue offline" }),
      );
      expect(selectScreen(store.getState())).toEqual({
        kind: "project",
        projectId: "offline",
      });
    });
  });

  it("requests an external link when Help is clicked", () => {
    const { effects } = renderWithAppStore(<HomeScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    expect(effects.calls).toContainEqual({
      type: "openExternalUrl",
      url: "https://github.com/justinsilvestre/easyimmerse",
    });
  });
});
