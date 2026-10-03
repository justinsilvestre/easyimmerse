import { resetBackend } from "@easyimmerse/backend";
import { mediaFileExtensions } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ProjectMediaFiles } from "./ProjectMediaFiles.tsx";

const addedMediaFile: MediaFile = {
  id: "m3",
  project_id: "p1",
  name: "clip.webm",
  source: { kind: "browser_file", size: 3, last_modified_ms: 1 },
  created_at_ms: 3,
  track_selection_json: null,
};

const pickedMediaFile = {
  name: "clip.webm",
  source: addedMediaFile.source,
};

function createClientThatAddsAndRemoves() {
  return createFakeBackendClient({
    ...fixtureResponses,
    "POST /projects/p1/media": addedMediaFile,
    "DELETE /projects/p1/media/m1": undefined,
  });
}

afterEach(() => {
  cleanup();
  resetBackend();
});

describe("ProjectMediaFiles", () => {
  it("lists the project's media files", async () => {
    renderWithAppStore(<ProjectMediaFiles projectId="p1" />);
    const list = await screen.findByRole("list", { name: "Media files" });
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => within(item).getAllByRole("button")[0]?.textContent),
    ).toEqual(["episode.mkv", "interview.mp3"]);
  });

  it("opens a clicked media file", async () => {
    const { store } = renderWithAppStore(<ProjectMediaFiles projectId="p1" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "interview.mp3" }),
    );
    expect(store.getState().app.currentMediaFileId).toBe("m2");
  });

  it("requests a media file pick when Add media is clicked", async () => {
    const { effects } = renderWithAppStore(
      <ProjectMediaFiles projectId="p1" />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Add media" }));
    expect(effects.calls).toContainEqual({
      type: "pickMediaFile",
      accept: mediaFileExtensions,
    });
  });

  it("sends a picked media file to the project", async () => {
    const client = createClientThatAddsAndRemoves();
    const { effects } = renderWithAppStore(
      <ProjectMediaFiles projectId="p1" />,
      client,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Add media" }));
    effects.resolvePickMediaFile(pickedMediaFile);
    await vi.waitFor(() => {
      expect(client.requests).toContainEqual({
        method: "POST",
        path: "/projects/p1/media",
        body: { kind: "json", value: pickedMediaFile },
      });
    });
  });

  it("opens a media file once it is added", async () => {
    const { effects, store } = renderWithAppStore(
      <ProjectMediaFiles projectId="p1" />,
      createClientThatAddsAndRemoves(),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Add media" }));
    effects.resolvePickMediaFile(pickedMediaFile);
    await vi.waitFor(() => {
      expect(store.getState().app.currentMediaFileId).toBe("m3");
    });
  });

  it("asks the backend to remove a media file", async () => {
    const client = createClientThatAddsAndRemoves();
    renderWithAppStore(<ProjectMediaFiles projectId="p1" />, client);
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove episode.mkv" }),
    );
    await vi.waitFor(() => {
      expect(client.requests).toContainEqual({
        method: "DELETE",
        path: "/projects/p1/media/m1",
      });
    });
  });

  it("reports when the media files cannot be loaded", async () => {
    renderWithAppStore(
      <ProjectMediaFiles projectId="p1" />,
      createFakeBackendClient({}),
    );
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Could not load the media files.",
    );
  });
});
