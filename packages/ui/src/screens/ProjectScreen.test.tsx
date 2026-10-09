import type { BackendRequest } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import { actions, selectCurrentMediaFileId } from "@easyimmerse/state";
import type {
  ImportStepRequest,
  InstalledPlugin,
  MediaFile,
  MediaSourceJob,
  PluginForm,
} from "@easyimmerse/types";
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
import { exampleRunningJob } from "../projects/exampleMediaSourceJob.ts";
import { exampleShortBook } from "../reader/exampleDocuments.ts";
import { AppStoreProviders } from "../testSupport/AppStoreProviders.tsx";
import {
  createFakeBackendClient,
  type FakeResponse,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import {
  fixtureMediaFiles,
  fixtureMediaSourcePlugin,
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
        name: "pilot.mkv",
        source: { kind: "path", path: "/videos/pilot.mkv" },
      }),
    );
    await vi.waitFor(() =>
      expect(selectCurrentMediaFileId(store.getState())).toBe("m1"),
    );
  });

  it("offers no import button while no media-source plugin is installed", async () => {
    renderProject();
    await screen.findByRole("button", { name: "Add media" });
    expect(screen.queryByRole("button", { name: /Add from/ })).toBeNull();
  });

  it("labels a media-source plugin's button with its title when it names no label", async () => {
    renderImport({}, [{ ...fixtureMediaSourcePlugin, import_label: null }]);
    expect(
      await screen.findByRole("button", { name: "Video site" }),
    ).toBeDefined();
  });

  const urlForm: PluginForm = {
    title: "Add from a video site",
    description: null,
    fields: [
      {
        id: "url",
        label: "URL or video ID",
        hint: null,
        control: { kind: "text", value: "", placeholder: null },
      },
    ],
    actions: [{ id: "look-up", label: "Look up", style: "primary" }],
  };

  const subtitlesForm: PluginForm = {
    ...urlForm,
    fields: [
      {
        id: "subtitles",
        label: "Subtitles",
        hint: null,
        control: {
          kind: "choose-many",
          options: [{ id: "en", label: "English (automatic)", hint: null }],
          chosen: ["en"],
        },
      },
    ],
    actions: [{ id: "add", label: "Add", style: "primary" }],
  };

  /**
   * Renders the project with a fake media-source plugin whose import interface asks for a URL,
   * then for subtitles, and then starts a fetch that the job route reports as `polled`.
   */
  function renderImport(
    polled: Partial<MediaSourceJob> = {},
    plugins: InstalledPlugin[] = [fixtureMediaSourcePlugin],
    responses: Record<string, FakeResponse> = {},
  ) {
    const job = {
      ...exampleRunningJob,
      id: "j1",
      locator: "https://videos.example.com/abc",
    };
    const client = createFakeBackendClient(
      {
        ...fixtureResponses,
        "GET /dictionaries": { dictionaries: [] },
        "GET /plugins": { plugins },
        "POST /projects/p1/media/import-form": urlForm,
        "POST /projects/p1/media/import-step": (request: BackendRequest) =>
          stepRequestOf(request).action === "look-up"
            ? { kind: "form", form: subtitlesForm }
            : { kind: "job", job },
        "GET /projects/p1/media/from-source/j1": { ...job, ...polled },
        ...responses,
      },
      directPlaybackRoutes,
    );
    const rendered = renderWithAppStore(
      <ProjectScreen
        projectId="p1"
        onBack={() => undefined}
        onEditSettings={() => undefined}
      />,
      client,
      { server: fakeServer },
    );
    return { ...rendered, client };
  }

  const stepRequestOf = (request: BackendRequest) =>
    (request.body as { value: ImportStepRequest }).value;

  /** Goes through the fake plugin's forms up to the start of the fetch. */
  async function startImport() {
    fireEvent.click(
      await screen.findByRole("button", { name: "Add from a video site" }),
    );
    fireEvent.change(await screen.findByLabelText("URL or video ID"), {
      target: { value: "https://videos.example.com/abc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Look up" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add" }));
  }

  /** Imports media through the fake plugin, with a fetch that ends as `finished` says, and waits for the file to open. */
  async function importMedia(finished: Partial<MediaSourceJob> = {}) {
    const rendered = renderImport({
      status: "done",
      media_file: fixtureMediaFiles.media_files[0],
      ...finished,
    });
    await startImport();
    await vi.waitFor(() =>
      expect(selectCurrentMediaFileId(rendered.store.getState())).toBe("m1"),
    );
    return rendered;
  }

  it("sends each form's input with the pressed action to the plugin", async () => {
    const { client } = await importMedia();
    const steps = client.requests
      .filter(({ path }) => path === "/projects/p1/media/import-step")
      .map(stepRequestOf);
    expect(steps).toEqual([
      {
        plugin: "video-site",
        action: "look-up",
        input: [{ field: "url", values: ["https://videos.example.com/abc"] }],
      },
      {
        plugin: "video-site",
        action: "add",
        input: [{ field: "subtitles", values: ["en"] }],
      },
    ]);
  });

  it("names the chosen subtitles that an import did not add", async () => {
    const { effects } = await importMedia({
      skipped_subtitles: [{ id: "en", reason: "the plugin did not fetch it" }],
    });
    expect(
      effects.calls.flatMap((call) =>
        call.type === "showNotification" ? [call.message] : [],
      ),
    ).toEqual([
      "The subtitles “English (automatic)” were not added: the plugin did not fetch it.",
    ]);
  });

  it("shows the fetch's progress while it runs", async () => {
    renderImport();
    await startImport();
    await vi.waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "downloading the video and subtitles",
      ),
    );
  });

  it("stops asking about the fetch once it has failed", async () => {
    const { client } = renderImport({ status: "failed" });
    await startImport();
    const jobRequestCount = () =>
      pathsOf(client.requests, "GET").filter(
        (path) => path === "/projects/p1/media/from-source/j1",
      ).length;
    await vi.waitFor(() => expect(jobRequestCount()).toBe(1));
    await new Promise((resolve) => setTimeout(resolve, 2200));
    expect(jobRequestCount()).toBe(1);
  }, 10_000);

  it("ignores a form that arrives after its dialog was closed", async () => {
    const stale = Promise.withResolvers<PluginForm>();
    const formsAsked = { count: 0 };
    renderImport({}, undefined, {
      "POST /projects/p1/media/import-form": () => {
        formsAsked.count += 1;
        return formsAsked.count === 1 ? stale.promise : urlForm;
      },
    });
    const importButton = await screen.findByRole("button", {
      name: "Add from a video site",
    });
    fireEvent.click(importButton);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(importButton);
    await screen.findByLabelText("URL or video ID");
    await act(async () => {
      stale.resolve({ ...urlForm, title: "Stale form" });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(screen.queryByRole("heading", { name: "Stale form" })).toBeNull();
  });

  it("starts one import when its action is pressed again before the fetch shows", async () => {
    const { client } = renderImport({}, undefined, {
      "GET /projects/p1/media/from-source/j1": () => new Promise(() => {}),
    });
    await startImport();
    await vi.waitFor(() =>
      expect(pathsOf(client.requests, "GET")).toContain(
        "/projects/p1/media/from-source/j1",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(
      pathsOf(client.requests, "POST").filter(
        (path) => path === "/projects/p1/media/import-step",
      ),
    ).toHaveLength(2);
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
