import type { BackendRequest } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import { actions, selectCurrentMediaFileId } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureMediaFiles,
  fixtureResponses,
} from "../testSupport/fixtureResponses.ts";
import {
  directPlaybackRoutes,
  fakeServer,
} from "../testSupport/mediaFixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ProjectScreen } from "./ProjectScreen.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

function renderProject(onEditSettings: () => void = () => undefined) {
  const client = createFakeBackendClient(
    {
      ...fixtureResponses,
      "POST /projects/p1/media": fixtureMediaFiles.media_files[0],
      "DELETE /projects/p1/media/m2": undefined,
    },
    directPlaybackRoutes,
  );
  const rendered = renderWithAppStore(
    <ProjectScreen
      projectId="p1"
      onBack={() => undefined}
      onEditSettings={onEditSettings}
    />,
    client,
    { server: fakeServer },
  );
  return { ...rendered, client };
}

const pathsOf = (requests: BackendRequest[], method: string) =>
  requests
    .filter((request) => request.method === method)
    .map((request) => request.path);

describe("ProjectScreen", () => {
  it("shows the project's name", async () => {
    renderProject();
    expect(await screen.findByRole("heading", { name: "Alpha" })).toBeDefined();
  });

  it("records that the project was opened", async () => {
    const { client } = renderProject();
    await vi.waitFor(() =>
      expect(pathsOf(client.requests, "POST")).toContain("/projects/p1/opened"),
    );
  });

  it("lists the project's media files", async () => {
    renderProject();
    expect(
      await screen.findByRole("button", { name: "Audio interview.mp3" }),
    ).toBeDefined();
  });

  it("opens a media file when it is clicked", async () => {
    const { store } = renderProject();
    fireEvent.click(
      await screen.findByRole("button", { name: "Video episode.mkv" }),
    );
    expect(selectCurrentMediaFileId(store.getState())).toBe("m1");
  });

  it("shows the media screen while a media file is open", async () => {
    const { store } = renderProject();
    await screen.findByRole("heading", { name: "Alpha" });
    act(() => store.dispatch(actions.openMedia("m1")));
    expect(
      await screen.findByRole("heading", { name: "episode.mkv" }),
    ).toBeDefined();
  });

  it("removes a media file through its menu", async () => {
    const { client } = renderProject();
    fireEvent.click(
      await screen.findByRole("button", { name: "Actions for interview.mp3" }),
    );
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Remove from project" }),
    );
    await vi.waitFor(() =>
      expect(pathsOf(client.requests, "DELETE")).toContain(
        "/projects/p1/media/m2",
      ),
    );
  });

  it("sends a picked media file to the project and opens it", async () => {
    const { effects, store } = renderProject();
    await screen.findByRole("button", { name: "Video episode.mkv" });
    fireEvent.click(screen.getByRole("button", { name: "Add media" }));
    act(() =>
      effects.resolvePickMediaFile({
        name: "episode.mkv",
        source: { kind: "path", path: "/videos/episode.mkv" },
      }),
    );
    await vi.waitFor(() =>
      expect(selectCurrentMediaFileId(store.getState())).toBe("m1"),
    );
  });

  it("opens the project's settings", async () => {
    let opened = false;
    renderProject(() => (opened = true));
    await screen.findByRole("heading", { name: "Alpha" });
    // The first Settings button is the project's; the footer's opens the app's settings.
    fireEvent.click(
      screen.getAllByRole("button", { name: "Settings" })[0] as HTMLElement,
    );
    expect(opened).toBe(true);
  });
});
