import type { MediaFile } from "@easyimmerse/types";
import { describe, expect, it, vi } from "vitest";
import { actions } from "./actions.ts";
import { createAppStore } from "./createAppStore.ts";
import { createFakeServerStoreParts } from "./createFakeServerStoreParts.ts";
import type { Effects } from "./effects.ts";
import type { PickedFile } from "./filePick/chosenFile.ts";
import { createRecordingEffects } from "./recordingEffects.ts";
import { createMediaFile } from "./testSupport/createMediaFile.ts";

const subtitles = { kind: "subtitles", role: "target" } as const;

const pickedFile: PickedFile = {
  name: "episode.srt",
  source: { kind: "path", path: "/videos/episode.srt" },
};

const mediaWithStoredTrack = (): MediaFile =>
  createMediaFile({
    subtitle_tracks: [
      {
        id: "t1",
        name: "episode.srt",
        role: "target",
        language: null,
        source: { kind: "file", source: { kind: "browser_file", key: "k1" } },
      },
    ],
  });

const dictionary = { kind: "dictionary" } as const;

const storedDictionary: PickedFile = {
  name: "dictionary.zip",
  source: { kind: "browser_file", key: "k1" },
};

const storedDocument = (): MediaFile =>
  createMediaFile({
    id: "m2",
    kind: "document",
    name: "book.epub",
    source: { kind: "browser_file", key: "k2" },
  });

function createStore(effects: Effects = createRecordingEffects()) {
  const server = createFakeServerStoreParts();
  return { store: createAppStore(effects, server), server };
}

describe("effectsMiddleware", () => {
  it("calls seekPlayer after seekRequested is dispatched", () => {
    const effects = createRecordingEffects();
    createStore(effects).store.dispatch(actions.seekRequested(12_500));
    expect(effects.calls).toEqual([{ type: "seekPlayer", ms: 12_500 }]);
  });

  it("dispatches fileChosen with the purpose once the file pick resolves", async () => {
    const effects = createRecordingEffects();
    const { store, server } = createStore(effects);
    store.dispatch(actions.filePickRequested(subtitles));
    effects.resolvePickFile(pickedFile);
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.fileChosen(subtitles, pickedFile),
      );
    });
  });

  it("dispatches filePickCancelled once the file pick resolves to null", async () => {
    const effects = createRecordingEffects();
    const { store, server } = createStore(effects);
    store.dispatch(actions.filePickRequested(subtitles));
    effects.resolvePickFile(null);
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.filePickCancelled(),
      );
    });
  });

  it("dispatches filePickCancelled once the file pick fails", async () => {
    const effects = createRecordingEffects();
    const { store, server } = createStore(effects);
    store.dispatch(actions.filePickRequested(subtitles));
    effects.rejectPickFile(new Error("dialog unavailable"));
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.filePickCancelled(),
      );
    });
  });

  it("stores the resolved media URL after mediaOpened", async () => {
    const { store } = createStore();
    store.dispatch(actions.mediaOpened("p1", createMediaFile()));
    await vi.waitFor(() => {
      expect(store.getState().app.player.mediaUrl).toBe("blob:test");
    });
  });

  it("stores the failure message when the media URL cannot be resolved", async () => {
    const effects: Effects = {
      ...createRecordingEffects(),
      resolveMediaUrl: () => Promise.reject(new Error("file moved")),
    };
    const { store } = createStore(effects);
    store.dispatch(actions.mediaOpened("p1", createMediaFile()));
    await vi.waitFor(() => {
      expect(store.getState().app.player.mediaUrlError).toBe("file moved");
    });
  });

  it("stores the text of a subtitle file the browser holds after mediaOpened", async () => {
    const effects = createRecordingEffects();
    effects.storedFileTexts.set("k1", "WEBVTT");
    const { store } = createStore(effects);
    store.dispatch(actions.mediaOpened("p1", mediaWithStoredTrack()));
    await vi.waitFor(() => {
      expect(store.getState().app.subtitles.browserFileTexts).toEqual({
        t1: "WEBVTT",
      });
    });
  });

  it("dispatches subtitleTextFailed when a stored subtitle file cannot be read", async () => {
    const { store, server } = createStore();
    store.dispatch(actions.mediaOpened("p1", mediaWithStoredTrack()));
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.subtitleTextFailed("t1", "Nothing is stored at k1."),
      );
    });
  });

  it("dispatches chosenFileBytesRead once a stored dictionary's bytes are read", async () => {
    const effects = createRecordingEffects();
    const bytes = new Uint8Array([1, 2]);
    effects.storedFileBytes.set("k1", bytes);
    const { store, server } = createStore(effects);
    store.dispatch(actions.fileChosen(dictionary, storedDictionary));
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.chosenFileBytesRead("k1", bytes),
      );
    });
  });

  it("dispatches documentBytesRead once a stored document's bytes are read", async () => {
    const effects = createRecordingEffects();
    const bytes = new Uint8Array([3]);
    effects.storedFileBytes.set("k2", bytes);
    const { store, server } = createStore(effects);
    store.dispatch(actions.mediaOpened("p1", storedDocument()));
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.documentBytesRead("m2", bytes),
      );
    });
  });

  it("dispatches storedFileReadFailed when a stored file's bytes cannot be read", async () => {
    const { store, server } = createStore();
    store.dispatch(actions.fileChosen(dictionary, storedDictionary));
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.storedFileReadFailed("Nothing is stored at k1."),
      );
    });
  });

  it("dispatches frameCaptured with the captured frame after frameCaptureRequested", async () => {
    const effects = createRecordingEffects();
    effects.frameDataUrl = "data:image/png;base64,AA";
    const { store, server } = createStore(effects);
    store.dispatch(actions.frameCaptureRequested());
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.frameCaptured("data:image/png;base64,AA"),
      );
    });
  });

  it("dispatches preferenceLoaded after preferencesLoadRequested", async () => {
    const effects = createRecordingEffects();
    effects.preferences.set("showTranslations", "true");
    const { store, server } = createStore(effects);
    store.dispatch(actions.preferencesLoadRequested());
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.preferenceLoaded("showTranslations", "true"),
      );
    });
  });

  it("calls savePreference after preferenceToggled is dispatched", () => {
    const effects = createRecordingEffects();
    createStore(effects).store.dispatch(
      actions.preferenceToggled("showTranslations"),
    );
    expect(effects.preferences.get("showTranslations")).toBe("true");
  });

  it("calls showNotification with a confirmation after cueCopyRequested is dispatched", () => {
    const effects = createRecordingEffects();
    createStore(effects).store.dispatch(actions.cueCopyRequested("Hello"));
    expect(effects.calls).toContainEqual({
      type: "showNotification",
      message: "Copied to clipboard",
    });
  });
});
