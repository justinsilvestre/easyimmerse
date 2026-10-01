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

  it("records a copyToClipboard call with its text", async () => {
    const effects = createRecordingEffects();
    await effects.copyToClipboard("Hello");
    expect(effects.calls).toEqual([{ type: "copyToClipboard", text: "Hello" }]);
  });
});
