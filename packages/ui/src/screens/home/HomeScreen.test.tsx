import type { BackendClient } from "@easyimmerse/backend";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeBackendClient } from "../../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
} from "../../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { HomeScreen } from "./HomeScreen.tsx";

const offlineClient: BackendClient = {
  send: async () => ({ error: { status: "OFFLINE", message: "No server." } }),
};

afterEach(cleanup);

function renderHome(
  callbacks: {
    onOpenProject?: (projectId: string) => void;
    onReviewProject?: (projectId: string) => void;
    onCreateProject?: () => void;
    onContinueOffline?: () => void;
  } = {},
  client?: BackendClient,
) {
  return renderWithAppStore(
    <HomeScreen
      onOpenProject={callbacks.onOpenProject ?? (() => undefined)}
      onReviewProject={callbacks.onReviewProject ?? (() => undefined)}
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

    it("calls onReviewProject with the id of a project whose Review is clicked", async () => {
      const reviewed: string[] = [];
      const client = createFakeBackendClient({
        ...fixtureResponses,
        "GET /review/counts": {
          projects: [
            { project_id: "p1", due_count: 8, learning_count: 0, new_count: 0 },
          ],
        },
      });
      renderHome({ onReviewProject: (id) => reviewed.push(id) }, client);
      fireEvent.click(await screen.findByRole("button", { name: /^Review/ }));
      expect(reviewed).toEqual(["p1"]);
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

  it("shows the card about backing up above the projects once a flashcard is kept only on this computer", async () => {
    const client = createFakeBackendClient({
      ...fixtureResponses,
      "GET /projects": {
        projects: [{ ...fixtureProject, flashcard_count: 1 }],
      },
    });
    renderWithAppStore(
      <HomeScreen
        onOpenProject={() => undefined}
        onReviewProject={() => undefined}
        onCreateProject={() => undefined}
        onContinueOffline={() => undefined}
      />,
      client,
      {
        server: {
          serverUrl: "http://127.0.0.1:1",
          token: "t",
          bundledIn: "desktop",
        },
      },
    );
    const card = await screen.findByRole("region", {
      name: "Saved only on this computer",
    });
    const title = screen.getByRole("heading", { name: "Projects" });
    expect(
      card.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
