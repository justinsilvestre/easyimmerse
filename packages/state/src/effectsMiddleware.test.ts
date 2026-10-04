import { describe, expect, it, vi } from "vitest";
import { actions } from "./actions.ts";
import { createAppStore } from "./createAppStore.ts";
import { createFakeServerStoreParts } from "./createFakeServerStoreParts.ts";
import type {
  PickedDictionaryFile,
  PickedFile,
  PickedMediaFile,
} from "./effects.ts";
import { createRecordingEffects } from "./recordingEffects.ts";

const pickedFile: PickedFile = {
  name: "episode.srt",
  source: { kind: "inline", text: "1\n00:00:01,000 --> 00:00:02,000\nHello" },
};

const pickedMediaFile: PickedMediaFile = {
  name: "episode.mkv",
  source: { kind: "path", path: "/videos/episode.mkv" },
};

const pickedDictionaryFile: PickedDictionaryFile = {
  name: "jmdict.zip",
  source: { kind: "bytes", bytes: new Uint8Array([80, 75]) },
};

const dictionaryLanguages = { sourceLanguage: "ja", targetLanguage: "en" };

describe("effectsMiddleware", () => {
  it("calls seekPlayer after seekRequested is dispatched", () => {
    const effects = createRecordingEffects();
    const store = createAppStore(effects, createFakeServerStoreParts());
    store.dispatch(actions.seekRequested(12.5));
    expect(effects.calls).toEqual([{ type: "seekPlayer", seconds: 12.5 }]);
  });

  it("dispatches fileChosen once the file pick resolves", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.subtitleFilePickRequested("target"));
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
    store.dispatch(actions.subtitleFilePickRequested("target"));
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
    store.dispatch(actions.subtitleFilePickRequested("target"));
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

  it("dispatches dictionaryFileChosen once the dictionary file pick resolves", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.dictionaryFilePickRequested(dictionaryLanguages));
    effects.resolvePickDictionaryFile(pickedDictionaryFile);
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.dictionaryFileChosen(pickedDictionaryFile),
      );
    });
  });

  it("dispatches dictionaryFilePickCancelled once the dictionary file pick fails", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.dictionaryFilePickRequested(dictionaryLanguages));
    effects.rejectPickDictionaryFile(new Error("denied"));
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.dictionaryFilePickCancelled(),
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

  it("calls showNotification with a confirmation after cueCopyRequested is dispatched", () => {
    const effects = createRecordingEffects();
    const store = createAppStore(effects, createFakeServerStoreParts());
    store.dispatch(actions.cueCopyRequested("Hello"));
    expect(effects.calls).toContainEqual({
      type: "showNotification",
      message: "Copied to clipboard",
    });
  });
});
