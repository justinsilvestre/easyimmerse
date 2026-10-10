import type { BackendClient } from "@easyimmerse/backend";
import { selectRoute } from "@easyimmerse/state";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { HomeScreen } from "./HomeScreen.tsx";

const offlineClient: BackendClient = {
  send: async () => ({ error: { status: "OFFLINE", message: "No server." } }),
};

afterEach(cleanup);

function renderHome(
  callbacks: {
    onOpenProject?: (projectId: string) => void;
    onCreateProject?: () => void;
    onContinueOffline?: () => void;
  } = {},
  client?: BackendClient,
) {
  return renderWithAppStore(
    <HomeScreen
      onOpenProject={callbacks.onOpenProject ?? (() => undefined)}
      onCreateProject={callbacks.onCreateProject ?? (() => undefined)}
      onContinueOffline={callbacks.onContinueOffline ?? (() => undefined)}
    />,
    client,
  );
}

describe("HomeScreen", () => {
  describe("when projects load", () => {
    it("lists each project, most recently opened first", async () => {
      renderHome();
      const list = await screen.findByRole("list", { name: "Projects" });
      expect(
        within(list)
          .getAllByRole("listitem")
          .map((item) => item.textContent?.includes("Alpha")),
      ).toEqual([true, false]);
    });

    it("calls onOpenProject with the id of a clicked project", async () => {
      const opened: string[] = [];
      renderHome({ onOpenProject: (id) => opened.push(id) });
      fireEvent.click(await screen.findByRole("button", { name: /Beta/ }));
      expect(opened).toEqual(["p2"]);
    });

    it("calls onCreateProject when New project is clicked", async () => {
      let created = false;
      renderHome({ onCreateProject: () => (created = true) });
      fireEvent.click(
        await screen.findByRole("button", { name: "New project" }),
      );
      expect(created).toBe(true);
    });
  });

  describe("when no server is configured", () => {
    it("offers to continue offline", async () => {
      let offline = false;
      renderHome({ onContinueOffline: () => (offline = true) }, offlineClient);
      fireEvent.click(
        await screen.findByRole("button", { name: "Continue offline" }),
      );
      expect(offline).toBe(true);
    });
  });

  it("tells that the projects are loading until they arrive", () => {
    renderHome();
    expect(
      screen.getByRole("status", { name: "Loading projects" }),
    ).toBeDefined();
  });

  it("opens the dictionaries when Dictionaries is clicked", () => {
    const { store } = renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Dictionaries" }));
    expect(selectRoute(store.getState())).toEqual({
      screen: "settings",
      beneath: { screen: "home" },
      pages: ["dictionaries"],
    });
  });

  it("requests an external link when Help is clicked", () => {
    const { effects } = renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    expect(effects.calls).toContainEqual({
      type: "openExternalUrl",
      url: "https://github.com/justinsilvestre/easyimmerse",
    });
  });
});
