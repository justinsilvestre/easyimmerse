import type { BackendRequest } from "@easyimmerse/backend";
import { backendApi, resetBackend } from "@easyimmerse/backend";
import type { AppStore, FilePickPurpose, PickedFile } from "@easyimmerse/state";
import { actions, selectChosenFile, selectScreen } from "@easyimmerse/state";
import type { DictionarySummary, MediaFile } from "@easyimmerse/types";
import { act, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureProject } from "../testSupport/fixtureProject.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { useChosenFileHandler } from "./useChosenFileHandler.ts";

afterEach(() => {
  cleanup();
  resetBackend();
});

const video = fixtureProject.media[0] as MediaFile;

const addedMedia: MediaFile = { ...video, id: "media-9", name: "clip.mp4" };

const undeclaredDictionary: DictionarySummary = {
  id: "d9",
  title: "Imported",
  entry_count: 9,
  source_language: null,
  target_language: null,
};

const selectProjectQuery = backendApi.endpoints.getProject.select("project-1");

/** Reads the cached project. The app's root state type leaves the backend slice untyped, hence the cast. */
const selectProject = (store: AppStore) =>
  selectProjectQuery(store.getState() as never);

function ChosenFileProbe() {
  useChosenFileHandler();
  return null;
}

function renderHandler() {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "POST /projects/project-1/media": addedMedia,
    "POST /projects/project-1/media/media-1/subtitle-tracks": (
      request: BackendRequest,
    ) => ({ id: "track-9", ...(request.body?.value as object) }),
    "POST /dictionaries": undeclaredDictionary,
    "POST /dictionaries/import-local": undeclaredDictionary,
    "PUT /dictionaries/d9/languages": {
      ...undeclaredDictionary,
      source_language: "de",
      target_language: "en",
    },
  });
  const rendered = renderWithAppStore(<ChosenFileProbe />, client);
  const dispatch = (action: Parameters<AppStore["dispatch"]>[0]) =>
    act(() => {
      rendered.store.dispatch(action);
    });
  return { ...rendered, client, dispatch };
}

function choose(
  dispatch: ReturnType<typeof renderHandler>["dispatch"],
  purpose: FilePickPurpose,
  file: PickedFile,
) {
  dispatch(actions.fileChosen(purpose, file));
}

const storedFile = (name: string): PickedFile => ({
  name,
  source: { kind: "browser_file", key: "k1" },
});

const findRequest = (
  requests: BackendRequest[],
  method: string,
  path: string,
) =>
  requests.find(
    (request) => request.method === method && request.path === path,
  );

describe("useChosenFileHandler", () => {
  describe("for a media file", () => {
    it("adds it to the open project", async () => {
      const { client, dispatch } = renderHandler();
      dispatch(actions.projectOpened("project-1"));
      choose(dispatch, { kind: "media" }, storedFile("clip.mp4"));
      await vi.waitFor(() => {
        expect(
          findRequest(client.requests, "POST", "/projects/project-1/media")
            ?.body?.value,
        ).toEqual({
          name: "clip.mp4",
          kind: "video",
          source: { kind: "browser_file", key: "k1" },
        });
      });
    });

    it("opens the added media", async () => {
      const { store, dispatch } = renderHandler();
      dispatch(actions.projectOpened("project-1"));
      choose(dispatch, { kind: "media" }, storedFile("clip.mp4"));
      await vi.waitFor(() => {
        expect(selectScreen(store.getState())).toEqual({
          kind: "media",
          projectId: "project-1",
          mediaId: "media-9",
        });
      });
    });

    it("rejects a file of an unknown kind", async () => {
      const { effects, dispatch } = renderHandler();
      dispatch(actions.projectOpened("project-1"));
      choose(dispatch, { kind: "media" }, storedFile("notes.pdf"));
      await vi.waitFor(() => {
        expect(effects.calls).toContainEqual({
          type: "showNotification",
          message: "Unsupported file type",
        });
      });
    });

    it("lets go of the chosen file once handled", async () => {
      const { store, dispatch } = renderHandler();
      dispatch(actions.projectOpened("project-1"));
      choose(dispatch, { kind: "media" }, storedFile("notes.pdf"));
      await vi.waitFor(() => {
        expect(selectChosenFile(store.getState())).toBeNull();
      });
    });
  });

  describe("for a subtitles file", () => {
    it("adds a track in the picked role to the open media", async () => {
      const { client, dispatch } = renderHandler();
      dispatch(actions.mediaOpened("project-1", video));
      choose(
        dispatch,
        { kind: "subtitles", role: "translation" },
        storedFile("episode.en.srt"),
      );
      await vi.waitFor(() => {
        expect(
          findRequest(
            client.requests,
            "POST",
            "/projects/project-1/media/media-1/subtitle-tracks",
          )?.body?.value,
        ).toEqual({
          name: "episode.en.srt",
          role: "translation",
          language: null,
          source: {
            kind: "file",
            source: { kind: "browser_file", key: "k1" },
          },
        });
      });
    });

    it("reads the text of the added track the browser holds", async () => {
      const { effects, dispatch } = renderHandler();
      dispatch(actions.mediaOpened("project-1", video));
      choose(
        dispatch,
        { kind: "subtitles", role: "target" },
        storedFile("episode.srt"),
      );
      await vi.waitFor(() => {
        expect(effects.calls).toContainEqual({
          type: "readStoredFileText",
          key: "k1",
        });
      });
    });
  });

  describe("for a dictionary", () => {
    it("imports a file on disk by its path", async () => {
      const { client, dispatch } = renderHandler();
      choose(
        dispatch,
        { kind: "dictionary" },
        { name: "d.zip", source: { kind: "path", path: "/d.zip" } },
      );
      await vi.waitFor(() => {
        expect(
          findRequest(client.requests, "POST", "/dictionaries/import-local")
            ?.body?.value,
        ).toEqual({ path: "/d.zip" });
      });
    });

    it("imports a file stored in the browser once its bytes are read", async () => {
      const { client, effects, dispatch } = renderHandler();
      effects.storedFileBytes.set("k1", new Uint8Array([1, 2]));
      choose(dispatch, { kind: "dictionary" }, storedFile("d.zip"));
      await vi.waitFor(() => {
        expect(
          findRequest(client.requests, "POST", "/dictionaries")?.body?.value,
        ).toEqual(new Uint8Array([1, 2]));
      });
    });

    it("gives a dictionary without languages those of the open project", async () => {
      const { client, store, dispatch } = renderHandler();
      dispatch(actions.projectOpened("project-1"));
      await vi.waitFor(() => {
        expect(selectProject(store).data).toBeDefined();
      });
      choose(
        dispatch,
        { kind: "dictionary" },
        { name: "d.zip", source: { kind: "path", path: "/d.zip" } },
      );
      await vi.waitFor(() => {
        expect(
          findRequest(client.requests, "PUT", "/dictionaries/d9/languages")
            ?.body?.value,
        ).toEqual({ source_language: "de", target_language: "en" });
      });
    });

    it("confirms the import", async () => {
      const { effects, dispatch } = renderHandler();
      choose(
        dispatch,
        { kind: "dictionary" },
        { name: "d.zip", source: { kind: "path", path: "/d.zip" } },
      );
      await vi.waitFor(() => {
        expect(effects.calls).toContainEqual({
          type: "showNotification",
          message: "Dictionary added: Imported",
        });
      });
    });
  });
});
