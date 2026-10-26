import { describe, expect, it } from "vitest";
import type { LocationReport } from "../route/routeEffect.ts";
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

  it("calls a link listener with each opened link", () => {
    const effects = createRecordingEffects();
    const links: string[] = [];
    effects.subscribeToOpenedLinks((link) => links.push(link));
    effects.openLink("easyimmerse://library");
    expect(links).toEqual(["easyimmerse://library"]);
  });

  it("hands a link opened before anything listens to the first listener", () => {
    const effects = createRecordingEffects();
    const links: string[] = [];
    effects.openLink("easyimmerse://library");
    effects.subscribeToOpenedLinks((link) => links.push(link));
    expect(links).toEqual(["easyimmerse://library"]);
  });

  it("hands a link opened before anything listens to only one listener", () => {
    const effects = createRecordingEffects();
    const links: string[] = [];
    effects.openLink("easyimmerse://library");
    effects.subscribeToOpenedLinks(() => undefined);
    effects.subscribeToOpenedLinks((link) => links.push(link));
    expect(links).toEqual([]);
  });

  describe("for the history", () => {
    const state = { previousPath: "/", origin: "app" } as const;

    /** Subscribes to the history of recording effects that start at home, and returns the reports. */
    function subscribedAtHome() {
      const effects = createRecordingEffects();
      effects.showAddress("/");
      const reports: LocationReport[] = [];
      effects.subscribeToLocation((report) => reports.push(report));
      return { effects, reports };
    }

    it("reports the address shown at once", () => {
      expect(subscribedAtHome().reports).toEqual([
        { path: "/", state: null, cause: "traversal" },
      ]);
    });

    it("reports each write at once", () => {
      const { effects, reports } = subscribedAtHome();
      effects.writeLocation({ path: "/library", state }, "push");
      expect(reports.at(-1)).toEqual({
        path: "/library",
        state,
        cause: "write",
      });
    });

    it("reports the previous entry once it returns to it", () => {
      const { effects, reports } = subscribedAtHome();
      effects.writeLocation({ path: "/library", state }, "push");
      effects.returnToPreviousLocation();
      expect(reports.at(-1)).toEqual({
        path: "/",
        state: null,
        cause: "traversal",
      });
    });

    it("reports nothing before an address is shown or written", () => {
      const reports: LocationReport[] = [];
      createRecordingEffects().subscribeToLocation((report) =>
        reports.push(report),
      );
      expect(reports).toEqual([]);
    });
  });
});
