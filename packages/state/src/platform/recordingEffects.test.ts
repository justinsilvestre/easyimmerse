import { describe, expect, it } from "vitest";
import type { PickedFile } from "./effects.ts";
import { createRecordingEffects } from "./recordingEffects.ts";

const pickedFile: PickedFile = {
  name: "episode.srt",
  source: { kind: "inline", text: "Hello" },
};

describe("createRecordingEffects", () => {
  it("records each call with its arguments", async () => {
    const effects = createRecordingEffects();
    await effects.savePreference("showTranslations", "true");
    expect(effects.calls).toEqual([
      { type: "savePreference", key: "showTranslations", value: "true" },
    ]);
  });

  it("loads a preference that was saved earlier", async () => {
    const effects = createRecordingEffects();
    await effects.savePreference("showTranslations", "true");
    expect(await effects.loadPreference("showTranslations")).toBe("true");
  });

  it("loads null for a preference that was never saved", async () => {
    const effects = createRecordingEffects();
    expect(await effects.loadPreference("showTranslations")).toBeNull();
  });

  it("loads a preference it holds from the start", async () => {
    const effects = createRecordingEffects({ showTranslations: "true" });
    expect(await effects.loadPreference("showTranslations")).toBe("true");
  });

  describe("while it holds preference loads", () => {
    it("keeps a load waiting", async () => {
      const effects = createRecordingEffects({}, true);
      let isLoaded = false;
      effects.loadPreference("showTranslations").then(() => {
        isLoaded = true;
      });
      for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
      expect(isLoaded).toBe(false);
    });

    it("finishes the load once released", async () => {
      const effects = createRecordingEffects(
        { showTranslations: "true" },
        true,
      );
      const loaded = effects.loadPreference("showTranslations");
      effects.releasePreferenceLoads();
      expect(await loaded).toBe("true");
    });
  });

  it("settles a pending file pick with the given file", async () => {
    const effects = createRecordingEffects();
    const pick = effects.pickFile([".srt"]);
    effects.resolvePickFile(pickedFile);
    expect(await pick).toBe(pickedFile);
  });

  it("throws when no file pick is pending", () => {
    const effects = createRecordingEffects();
    expect(() => effects.resolvePickFile(null)).toThrow(
      "No file pick is pending.",
    );
  });

  it("settles a pending media file pick with the given file", async () => {
    const effects = createRecordingEffects();
    const pick = effects.pickMediaFile([".mp4"]);
    const file = {
      name: "a.mp4",
      source: { kind: "path", path: "/a.mp4" },
    } as const;
    effects.resolvePickMediaFile(file);
    expect(await pick).toBe(file);
  });

  it("throws when no media file pick is pending", () => {
    const effects = createRecordingEffects();
    expect(() => effects.resolvePickMediaFile(null)).toThrow(
      "No media file pick is pending.",
    );
  });

  it("settles a pending dictionary file pick with the given file", async () => {
    const effects = createRecordingEffects();
    const pick = effects.pickDictionaryFile([".zip"]);
    const file = {
      name: "a.zip",
      source: { kind: "path", path: "/a.zip" },
    } as const;
    effects.resolvePickDictionaryFile(file);
    expect(await pick).toBe(file);
  });

  it("calls a settings listener when settings are requested", () => {
    const effects = createRecordingEffects();
    let callCount = 0;
    effects.subscribeToSettingsRequests(() => {
      callCount += 1;
    });
    effects.requestSettings();
    expect(callCount).toBe(1);
  });

  it("stops calling a settings listener after it unsubscribes", () => {
    const effects = createRecordingEffects();
    let callCount = 0;
    const unsubscribe = effects.subscribeToSettingsRequests(() => {
      callCount += 1;
    });
    unsubscribe();
    effects.requestSettings();
    expect(callCount).toBe(0);
  });
});
