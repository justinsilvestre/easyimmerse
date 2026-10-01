import { resetBackend } from "@easyimmerse/backend";
import { selectScreen } from "@easyimmerse/state";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureProject } from "../testSupport/fixtureProject.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ProjectScreen } from "./ProjectScreen.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

const videoName = "Dark S01E01 – Geheimnisse.mkv";

function renderProjectScreen(responses = {}) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "PUT /projects/project-1/settings": fixtureProject,
    "DELETE /projects/project-1/media/media-1": undefined,
    ...responses,
  });
  const rendered = renderWithAppStore(
    <ProjectScreen projectId="project-1" />,
    client,
  );
  return { ...rendered, client };
}

const findTitle = () =>
  screen.findByRole("heading", { name: "Dark, season one" });

describe("ProjectScreen", () => {
  it("shows the project's name", async () => {
    renderProjectScreen();
    expect(await findTitle()).toBeTruthy();
  });

  it("counts the project's flashcards", async () => {
    renderProjectScreen({
      "GET /projects/project-1/flashcards": {
        flashcards: [{ id: "f1" }],
      },
    });
    expect(await screen.findByText("1 flashcard")).toBeTruthy();
  });

  describe("dictionary status", () => {
    it("is ready when a dictionary covers the target language", async () => {
      renderProjectScreen();
      expect(
        await screen.findByText("Dictionaries ready for German"),
      ).toBeTruthy();
    });

    it("offers to set up dictionaries when none covers the target language", async () => {
      const { effects } = renderProjectScreen({
        "GET /dictionaries": { dictionaries: [] },
      });
      fireEvent.click(
        await screen.findByRole("button", { name: "Set up dictionaries" }),
      );
      expect(effects.calls).toContainEqual(
        expect.objectContaining({
          type: "pickFile",
          purpose: { kind: "dictionary" },
        }),
      );
    });
  });

  it("returns home when Back is clicked", async () => {
    const { store } = renderProjectScreen();
    fireEvent.click(
      await screen.findByRole("button", { name: /All projects/ }),
    );
    expect(selectScreen(store.getState())).toEqual({ kind: "home" });
  });

  it("opens a media file when it is clicked", async () => {
    const { store } = renderProjectScreen();
    fireEvent.click(await screen.findByRole("button", { name: videoName }));
    expect(selectScreen(store.getState())).toEqual({
      kind: "media",
      projectId: "project-1",
      mediaId: "media-1",
    });
  });

  it("asks for a media file when Add media is clicked", async () => {
    const { effects } = renderProjectScreen();
    fireEvent.click(await screen.findByRole("button", { name: "Add media" }));
    expect(effects.calls).toContainEqual(
      expect.objectContaining({ type: "pickFile", purpose: { kind: "media" } }),
    );
  });

  it("removes a media file once the removal is confirmed", async () => {
    const { client } = renderProjectScreen();
    fireEvent.click(
      await screen.findByRole("button", { name: `Remove ${videoName}` }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await vi.waitFor(() => {
      expect(client.requests).toContainEqual(
        expect.objectContaining({
          method: "DELETE",
          path: "/projects/project-1/media/media-1",
        }),
      );
    });
  });

  describe("when the settings are edited", () => {
    async function openSettings() {
      const rendered = renderProjectScreen();
      fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
      return rendered;
    }

    it("shows the settings form", async () => {
      await openSettings();
      expect(
        screen.getByRole("heading", { name: "Project settings" }),
      ).toBeTruthy();
    });

    it("saves the settings and returns to the project", async () => {
      await openSettings();
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      expect(await findTitle()).toBeTruthy();
    });

    it("returns to the project when cancelled", async () => {
      await openSettings();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(await findTitle()).toBeTruthy();
    });
  });

  it("says that Anki export is not available yet", async () => {
    const { effects } = renderProjectScreen();
    fireEvent.click(
      await screen.findByRole("button", { name: "Export Anki deck" }),
    );
    expect(effects.calls).toContainEqual({
      type: "showNotification",
      message: "Anki deck export is not available yet.",
    });
  });
});
