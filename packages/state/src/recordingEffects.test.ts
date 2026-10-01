import { describe, expect, it } from "vitest";
import type { PickedFile } from "./filePick/chosenFile.ts";
import { createRecordingEffects } from "./recordingEffects.ts";
import { createMediaFile } from "./testSupport/createMediaFile.ts";

const pickedFile: PickedFile = {
  name: "episode.srt",
  source: { kind: "browser_file", key: "k1" },
};

const subtitles = { kind: "subtitles", role: "target" } as const;

describe("createRecordingEffects", () => {
  it("records each call with its arguments", async () => {
    const effects = createRecordingEffects();
    await effects.savePreference("showTranslations", "true");
    expect(effects.calls).toEqual([
      { type: "savePreference", key: "showTranslations", value: "true" },
    ]);
  });

  it("records player calls", () => {
    const effects = createRecordingEffects();
    effects.seekPlayer(1500);
    effects.pausePlayer();
    expect(effects.calls).toEqual([
      { type: "seekPlayer", ms: 1500 },
      { type: "pausePlayer" },
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

  it("settles a pending file pick with the given file", async () => {
    const effects = createRecordingEffects();
    const pick = effects.pickFile(subtitles, [".srt"]);
    effects.resolvePickFile(pickedFile);
    expect(await pick).toBe(pickedFile);
  });

  it("throws when no file pick is pending", () => {
    const effects = createRecordingEffects();
    expect(() => effects.resolvePickFile(null)).toThrow(
      "No file pick is pending.",
    );
  });

  it("resolves a test media URL", async () => {
    const effects = createRecordingEffects();
    expect(await effects.resolveMediaUrl("p1", createMediaFile())).toBe(
      "blob:test",
    );
  });

  it("reads a stored file's text", async () => {
    const effects = createRecordingEffects();
    effects.storedFileTexts.set("k1", "Hello");
    expect(await effects.readStoredFileText("k1")).toBe("Hello");
  });

  it("rejects reading a file that was never stored", async () => {
    const effects = createRecordingEffects();
    await expect(effects.readStoredFileText("k1")).rejects.toThrow("k1");
  });

  it("reads a stored file's bytes", async () => {
    const effects = createRecordingEffects();
    effects.storedFileBytes.set("k1", new Uint8Array([7]));
    expect(await effects.readStoredFileBytes("k1")).toEqual(
      new Uint8Array([7]),
    );
  });

  it("rejects reading bytes that were never stored", async () => {
    const effects = createRecordingEffects();
    await expect(effects.readStoredFileBytes("k1")).rejects.toThrow("k1");
  });

  it("captures the frame a test set", async () => {
    const effects = createRecordingEffects();
    effects.frameDataUrl = "data:image/png;base64,AA";
    expect(await effects.captureFrame()).toBe("data:image/png;base64,AA");
  });

  it("records a copyToClipboard call with its text", async () => {
    const effects = createRecordingEffects();
    await effects.copyToClipboard("Hello");
    expect(effects.calls).toEqual([{ type: "copyToClipboard", text: "Hello" }]);
  });
});
