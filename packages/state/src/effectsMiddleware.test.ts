import { describe, expect, it, vi } from "vitest";
import { actions } from "./actions.ts";
import { createAppStore } from "./createAppStore.ts";
import { createFakeServerStoreParts } from "./createFakeServerStoreParts.ts";
import type { PickedFile } from "./effects.ts";
import { createRecordingEffects } from "./recordingEffects.ts";

const pickedFile: PickedFile = {
  name: "episode.srt",
  source: { kind: "inline", text: "1\n00:00:01,000 --> 00:00:02,000\nHello" },
};

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

  it("dispatches preferenceLoaded after preferencesLoadRequested", async () => {
    const effects = createRecordingEffects();
    effects.preferences.set("showTranslations", "true");
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.preferencesLoadRequested());
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.preferenceLoaded("showTranslations", "true"),
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
