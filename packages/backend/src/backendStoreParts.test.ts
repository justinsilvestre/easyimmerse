import type { RootState, ServerCacheSlice } from "@easyimmerse/state";
import {
  cacheEntry,
  createAppStore,
  createBrowserFileRegistry,
  createRecordingEffects,
} from "@easyimmerse/state";
import type { UnknownAction } from "redux";
import type { ThunkDispatch } from "redux-thunk";
import { describe, expect, it } from "vitest";
import { backendApi } from "./backendApi.ts";
import type { BackendClient, BackendRequest } from "./backendClient.ts";
import { createBackendStoreParts } from "./backendStoreParts.ts";
import type { FrameCapturer } from "./frameCapturer.ts";
import { runRequest } from "./requestRunner.ts";

type ThunkCapableDispatch = ThunkDispatch<RootState, unknown, UnknownAction>;

const client: BackendClient = {
  send: async <T>(_request: BackendRequest) => ({
    data: { projects: [] } as T,
  }),
};

/** A capturer whose frames are named after their time and whose files all show pictures. */
function createAnsweringCapturer(): FrameCapturer {
  return {
    capture: async (_file, atMs) => `frame-at-${atMs}`,
    probe: async () => true,
  };
}

const server = { serverUrl: "http://localhost:4000", token: "test-token" };

describe("createBackendStoreParts", () => {
  it("mounts the API reducer under the backend reducer path", () => {
    const store = createAppStore(
      createRecordingEffects(),
      createBackendStoreParts(client, null),
    );
    expect(store.getState()).toHaveProperty("backend");
  });

  it("lets the hand-built app store run RTK Query thunks through the given client", async () => {
    const store = createAppStore(
      createRecordingEffects(),
      createBackendStoreParts(client, null),
    );
    // The app store's dispatch is typed for app actions only; thunks reach it through the middleware chain.
    const dispatch = store.dispatch as unknown as ThunkCapableDispatch;
    const result = await dispatch(backendApi.endpoints.listProjects.initiate());
    expect(result.data).toEqual({ projects: [] });
  });

  it("stores query answers where the state package finds them", async () => {
    const tracksClient: BackendClient = {
      send: async <T>(_request: BackendRequest) => ({ data: "tracks" as T }),
    };
    const store = createAppStore(
      createRecordingEffects(),
      createBackendStoreParts(tracksClient, null),
    );
    const dispatch = store.dispatch as unknown as ThunkCapableDispatch;
    const file = { projectId: "p1", mediaFileId: "m1" };
    await dispatch(backendApi.endpoints.getMediaTracks.initiate(file));
    const slice = store.getState().backend as ServerCacheSlice;
    const entry = cacheEntry(slice, "getMediaTracks", file);
    expect(entry?.data).toBe("tracks");
  });

  it("hands the browser file registry to the book query", async () => {
    const registry = createBrowserFileRegistry<File>();
    const source = registry.register(new File(["x"], "notes.txt"));
    const store = createAppStore(
      createRecordingEffects(),
      createBackendStoreParts(client, null, {
        registry,
        frameCapturer: createAnsweringCapturer(),
      }),
    );
    const dispatch = store.dispatch as unknown as ThunkCapableDispatch;
    const result = await dispatch(
      backendApi.endpoints.openBook.initiate({ name: "notes.txt", source }),
    );
    expect(result.error).toBeUndefined();
  });

  it("hands the frame capturer to the frame query", async () => {
    const registry = createBrowserFileRegistry<File>();
    const source = registry.register(new File(["x"], "clip.mp4"));
    const store = createAppStore(
      createRecordingEffects(),
      createBackendStoreParts(client, null, {
        registry,
        frameCapturer: createAnsweringCapturer(),
      }),
    );
    const dispatch = store.dispatch as unknown as ThunkCapableDispatch;
    const result = await dispatch(
      backendApi.endpoints.captureFrame.initiate({
        file: { name: "clip.mp4", source },
        atMs: 1000,
      }),
    );
    expect(result.data?.url).toBe("frame-at-1000");
  });

  it("carries the request runner", () => {
    expect(createBackendStoreParts(client, null).runRequest).toBe(runRequest);
  });

  it("carries the server configuration", () => {
    expect(createBackendStoreParts(client, server).serverConfig).toBe(server);
  });
});
