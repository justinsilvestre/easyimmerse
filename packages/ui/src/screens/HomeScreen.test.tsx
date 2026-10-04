import type { BackendClient } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavigationActionsContext } from "../navigationContext.ts";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { HomeScreen } from "./HomeScreen.tsx";

const offlineClient: BackendClient = {
  send: async () => ({ error: { status: "OFFLINE", message: "No server." } }),
};

afterEach(() => {
  cleanup();
  resetBackend();
});

function renderHomeScreen(
  callbacks: Partial<Parameters<typeof HomeScreen>[0]> = {},
  client?: BackendClient,
) {
  return renderWithAppStore(
    <HomeScreen
      onOpenProject={() => undefined}
      onCreateProject={() => undefined}
      onContinueOffline={() => undefined}
      {...callbacks}
    />,
    client,
  );
}

describe("HomeScreen", () => {
  describe("when projects load", () => {
    it("lists each project by name, most recently opened first", async () => {
      renderHomeScreen();
      const list = await screen.findByRole("list", { name: "Projects" });
      const named = ["Alpha", "Beta"].map((name) =>
        within(list).getByRole("button", { name }),
      );
      expect(within(list).getAllByRole("button")).toEqual(named);
    });

    it("calls onOpenProject with the id of a clicked project", async () => {
      const opened: string[] = [];
      renderHomeScreen({ onOpenProject: (id) => opened.push(id) });
      fireEvent.click(await screen.findByRole("button", { name: "Beta" }));
      expect(opened).toEqual(["p2"]);
    });

    it("calls onCreateProject when New project is clicked", async () => {
      const onCreateProject = vi.fn();
      renderHomeScreen({ onCreateProject });
      fireEvent.click(
        await screen.findByRole("button", { name: "New project" }),
      );
      expect(onCreateProject).toHaveBeenCalledOnce();
    });
  });

  it("says that the projects are loading", () => {
    renderHomeScreen();
    expect(screen.getByText("Loading projects…")).toBeDefined();
  });

  it("reports when the projects cannot be loaded", async () => {
    renderHomeScreen(
      {},
      createFakeBackendClient({
        "GET /projects": fakeFailure({ status: 500, message: "Broken." }),
      }),
    );
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Could not load the projects.",
    );
  });

  describe("when no server is configured", () => {
    it("calls onContinueOffline when Continue offline is clicked", async () => {
      const onContinueOffline = vi.fn();
      renderHomeScreen({ onContinueOffline }, offlineClient);
      fireEvent.click(
        await screen.findByRole("button", { name: "Continue offline" }),
      );
      expect(onContinueOffline).toHaveBeenCalledOnce();
    });
  });

  it("opens the dictionaries when Dictionaries is clicked", () => {
    const openDictionaries = vi.fn();
    renderWithAppStore(
      <NavigationActionsContext
        value={{ openSettings: () => undefined, openDictionaries }}
      >
        <HomeScreen
          onOpenProject={() => undefined}
          onCreateProject={() => undefined}
          onContinueOffline={() => undefined}
        />
      </NavigationActionsContext>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dictionaries" }));
    expect(openDictionaries).toHaveBeenCalledOnce();
  });

  it("requests an external link when Help is clicked", () => {
    const { effects } = renderHomeScreen();
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    expect(effects.calls).toContainEqual({
      type: "openExternalUrl",
      url: "https://github.com/justinsilvestre/easyimmerse",
    });
  });
});
