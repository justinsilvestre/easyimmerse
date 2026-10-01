import type { BackendClient } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import { selectScreen } from "@easyimmerse/state";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
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

    it("tells the server the clicked project was opened", async () => {
      const client = createFakeBackendClient(fixtureResponses);
      renderWithAppStore(<HomeScreen />, client);
      fireEvent.click(await screen.findByRole("button", { name: "Beta" }));
      await vi.waitFor(() => {
        expect(client.requests.map((request) => request.path)).toContain(
          "/projects/p2/opened",
        );
      });
    });
  });

  it("opens the new project form when Create new project is clicked", () => {
    const { store } = renderWithAppStore(<HomeScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Create new project" }));
    expect(selectScreen(store.getState())).toEqual({ kind: "newProject" });
  });

  it("explains that projects need a server when none is configured", async () => {
    renderWithAppStore(<HomeScreen />, offlineClient);
    expect(
      await screen.findByText("Projects need the desktop app or a server"),
    ).toBeTruthy();
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
