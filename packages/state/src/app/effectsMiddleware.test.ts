import { describe, expect, it, vi } from "vitest";
import type { PickedFile, PickedMediaFile } from "../platform/effects.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import { actions } from "./appAction.ts";
import { createAppStore } from "./createAppStore.ts";
import { createFakeServerStoreParts } from "./createFakeServerStoreParts.ts";

const pickedFile: PickedFile = {
  name: "episode.srt",
  source: { kind: "inline", text: "1\n00:00:01,000 --> 00:00:02,000\nHello" },
};

const pickedMediaFile: PickedMediaFile = {
  name: "episode.mkv",
  source: { kind: "path", path: "/videos/episode.mkv" },
};

describe("effectsMiddleware", () => {
  it("calls seekPlayer after seekRequested is dispatched", () => {
    const effects = createRecordingEffects();
    const store = createAppStore(effects, createFakeServerStoreParts());
    store.dispatch(actions.openMediaFileRequested("p1", "m1"));
    store.dispatch(actions.seekRequested(12.5));
    expect(effects.calls).toEqual([{ type: "seekPlayer", seconds: 12.5 }]);
  });

  it("dispatches fileChosen once the file pick resolves", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.filePickRequested());
    effects.resolvePickFile(pickedFile);
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.fileChosen(pickedFile),
      );
    });
  });

  it("dispatches filePickCancelled once the file pick resolves to null", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.filePickRequested());
    effects.resolvePickFile(null);
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.filePickCancelled(),
      );
    });
  });

  it("dispatches filePickCancelled once the file pick fails", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.filePickRequested());
    effects.rejectPickFile(new Error("dialog unavailable"));
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.filePickCancelled(),
      );
    });
  });

  it("dispatches mediaFileChosen once the media file pick resolves", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.mediaFilePickRequested());
    effects.resolvePickMediaFile(pickedMediaFile);
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.mediaFileChosen(pickedMediaFile),
      );
    });
  });

  it("dispatches dictionaryFileChosen once the dictionary file pick resolves", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.dictionaryFilePickRequested());
    effects.resolvePickDictionaryFile(pickedMediaFile);
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.dictionaryFileChosen(pickedMediaFile),
      );
    });
  });

  it("dispatches mediaFilePickCancelled once the media file pick resolves to null", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.mediaFilePickRequested());
    effects.resolvePickMediaFile(null);
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.mediaFilePickCancelled(),
      );
    });
  });

  it("dispatches mediaFilePickCancelled once the media file pick fails", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.mediaFilePickRequested());
    effects.rejectPickMediaFile(new Error("dialog unavailable"));
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.mediaFilePickCancelled(),
      );
    });
  });

  it("dispatches preferencesLoaded with the stored values after preferencesLoadRequested", async () => {
    const effects = createRecordingEffects();
    effects.preferences.set("showTranslations", "true");
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.preferencesLoadRequested());
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.preferencesLoaded({ showTranslations: "true" }),
      );
    });
  });

  it("dispatches preferencesLoaded even when a preference fails to load", async () => {
    const effects = createRecordingEffects();
    effects.loadPreference = () => Promise.reject(new Error("storage locked"));
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.preferencesLoadRequested());
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.preferencesLoaded({}),
      );
    });
  });

  it("calls savePreference after preferenceToggled is dispatched", () => {
    const effects = createRecordingEffects();
    const store = createAppStore(effects, createFakeServerStoreParts());
    store.dispatch(actions.preferenceToggled("showTranslations"));
    expect(effects.preferences.get("showTranslations")).toBe("true");
  });

  it("dispatches readingLocationLoaded with the stored location after readingLocationLoadRequested", async () => {
    const location = { chapterIndex: 2, paragraphIndex: 3, offset: 4 };
    const effects = createRecordingEffects();
    effects.preferences.set("readingLocation:b1", JSON.stringify(location));
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.readingLocationLoadRequested("b1"));
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.readingLocationLoaded("b1", location),
      );
    });
  });

  it("dispatches readingLocationLoaded with null when the location fails to load", async () => {
    const effects = createRecordingEffects();
    effects.loadPreference = () => Promise.reject(new Error("storage locked"));
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.readingLocationLoadRequested("b1"));
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.readingLocationLoaded("b1", null),
      );
    });
  });

  it("stores the reading location as JSON after readingLocationReported in a new paragraph", () => {
    const location = { chapterIndex: 0, paragraphIndex: 1, offset: 2 };
    const effects = createRecordingEffects();
    const store = createAppStore(effects, createFakeServerStoreParts());
    store.dispatch(actions.readingLocationReported("b1", location));
    expect(effects.preferences.get("readingLocation:b1")).toBe(
      JSON.stringify(location),
    );
  });
});
