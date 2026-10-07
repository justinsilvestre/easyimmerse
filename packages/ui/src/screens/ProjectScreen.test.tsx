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
import {
  exampleMediaDescription,
  exampleRunningJob,
} from "../projects/exampleMediaSourceJob.ts";
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
      origin: null,
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
        name: "episode.mkv",
        source: { kind: "path", path: "/videos/episode.mkv" },
      }),
    );
    await vi.waitFor(() =>
      expect(selectCurrentMediaFileId(store.getState())).toBe("m1"),
    );
  });

  it("offers no URL entry while no media-source plugin is installed", async () => {
    renderProject();
    await screen.findByRole("button", { name: "Add media" });
    expect(screen.queryByRole("button", { name: "Add from URL" })).toBeNull();
  });

  it("adds media from a URL through a media-source plugin and opens it once the fetch is done", async () => {
    const job = {
      ...exampleRunningJob,
      id: "j1",
      locator: "https://videos.example.com/abc",
    };
    const client = createFakeBackendClient(
      {
        ...fixtureResponses,
        "GET /dictionaries": { dictionaries: [] },
        "GET /plugins": {
          plugins: [
            { name: "video-site", version: "0.1.0", kind: "media-source" },
          ],
        },
        "POST /plugins/video-site/describe": exampleMediaDescription,
        "POST /projects/p1/media/from-source": job,
        "GET /projects/p1/media/from-source/j1": {
          ...job,
          status: "done",
          media_file: fixtureMediaFiles.media_files[0],
        },
      },
      directPlaybackRoutes,
    );
    const { store } = renderWithAppStore(
      <ProjectScreen
        projectId="p1"
        onBack={() => undefined}
        onEditSettings={() => undefined}
      />,
      client,
      { server: fakeServer },
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Add from URL" }),
    );
    fireEvent.change(screen.getByLabelText("URL or ID"), {
      target: { value: "https://videos.example.com/abc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Look up" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add" }));
    await vi.waitFor(() =>
      expect(selectCurrentMediaFileId(store.getState())).toBe("m1"),
    );
    const request = client.requests.find(
      ({ path }) => path === "/projects/p1/media/from-source",
    );
    expect(request?.body).toEqual({
      kind: "json",
      value: {
        plugin: "video-site",
        locator: "https://videos.example.com/abc",
        subtitles: ["en"],
      },
    });
  });

  it("shows the fetch's progress while it runs", async () => {
    const job = { ...exampleRunningJob, id: "j1" };
    const client = createFakeBackendClient(
      {
        ...fixtureResponses,
        "GET /dictionaries": { dictionaries: [] },
        "GET /plugins": {
          plugins: [
            { name: "video-site", version: "0.1.0", kind: "media-source" },
          ],
        },
        "POST /plugins/video-site/describe": exampleMediaDescription,
        "POST /projects/p1/media/from-source": job,
        "GET /projects/p1/media/from-source/j1": job,
      },
      directPlaybackRoutes,
    );
    renderWithAppStore(
      <ProjectScreen
        projectId="p1"
        onBack={() => undefined}
        onEditSettings={() => undefined}
      />,
      client,
      { server: fakeServer },
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Add from URL" }),
    );
    fireEvent.change(screen.getByLabelText("URL or ID"), {
      target: { value: "https://videos.example.com/abc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Look up" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add" }));
    await vi.waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "downloading the video and subtitles",
      ),
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
