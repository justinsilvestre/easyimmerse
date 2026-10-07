import type { BackendRequest } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import { actions, selectCurrentMediaFileId } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSharedSaving } from "../flashcards/sharedSaving.ts";
import { exampleUnsavedCard } from "../flashcards/unsaved/exampleUnsavedCard.ts";
import { exampleShortBook } from "../reader/exampleDocuments.ts";
import { AppStoreProviders } from "../testSupport/AppStoreProviders.tsx";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
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
      "GET /dictionaries": { dictionaries: [] },
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

  it("offers to set up dictionaries when none covers the project's languages", async () => {
    renderProject();
    expect(
      await screen.findByRole("button", { name: "Set up dictionaries" }),
    ).toBeDefined();
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

  it("narrows the media list to one kind of file from its heading menu", async () => {
    renderProject();
    await screen.findByRole("button", { name: "Audio interview.mp3" });
    fireEvent.click(screen.getByRole("button", { name: "Media" }));
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: "Audio (1)" }),
    );
    expect(
      screen.queryByRole("button", { name: "Video episode.mkv" }),
    ).toBeNull();
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

  it("shows the reader while an ebook is open", async () => {
    const book: MediaFile = {
      id: "b1",
      project_id: "p1",
      name: "sample.epub",
      source: { kind: "path", path: "/books/sample.epub" },
      created_at_ms: 0,
      track_selection_json: null,
    };
    const client = createFakeBackendClient({
      ...fixtureResponses,
      "GET /projects/p1/media": { media_files: [book] },
      "POST /documents/parse-local": exampleShortBook,
    });
    const { store } = renderWithAppStore(
      <ProjectScreen
        projectId="p1"
        onBack={() => undefined}
        onEditSettings={() => undefined}
      />,
      client,
    );
    await screen.findByRole("heading", { name: "Alpha" });
    act(() => {
      store.dispatch(actions.preferencesLoaded({}));
      store.dispatch(actions.openMedia("b1"));
    });
    expect(
      await screen.findByRole("heading", { name: "Sample Book" }),
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
        name: "pilot.mkv",
        source: { kind: "path", path: "/videos/pilot.mkv" },
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
    fireEvent.click(screen.getByRole("button", { name: "Project settings" }));
    expect(opened).toBe(true);
  });

  it("tells that a flashcard waiting to open there could not be opened when the project fails to load", async () => {
    const { store, playerRegistry } = createTestAppStore(
      createFakeBackendClient({
        ...fixtureResponses,
        "GET /projects/p1": fakeFailure({ status: 500, message: "Gone" }),
      }),
    );
    const sharedSaving = createSharedSaving();
    sharedSaving.unsavedCards.put(exampleUnsavedCard("Hund"));
    sharedSaving.unsavedCards.requestOpen("Hund");
    render(
      <AppStoreProviders
        store={store}
        playerRegistry={playerRegistry}
        sharedSaving={sharedSaving}
      >
        <ProjectScreen
          projectId="p1"
          onBack={() => undefined}
          onEditSettings={() => undefined}
        />
      </AppStoreProviders>,
    );
    expect(
      await screen.findByText(
        "Couldn't open the flashcard for “Hund”. It is still listed among the flashcards not saved.",
      ),
    ).toBeDefined();
  });
});
