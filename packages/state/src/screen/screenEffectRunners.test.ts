import type { PlaybackEnvironment } from "@easyimmerse/types";
import { describe, expect, it, vi } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import { createRequestTable } from "../server/requestTable.ts";
import { createTimerTable } from "../timers/timerTable.ts";
import { screenEffectRunners } from "./screenEffectRunners.ts";

/** Runs the save path pick through the given effects, and collects the actions it dispatches. */
function pickSavePathWith(effects: ReturnType<typeof createRecordingEffects>) {
  const dispatched: AppAction[] = [];
  screenEffectRunners.pickSavePath(
    { type: "pickSavePath", suggestedFileName: "Korean.apkg" },
    {
      effects,
      dispatch: (action) => dispatched.push(action),
      timers: createTimerTable(effects.clock),
      requests: createRequestTable(() => {
        throw new Error("No request is expected.");
      }),
    },
  );
  return dispatched;
}

describe("screenEffectRunners", () => {
  it("asks the platform where to save, suggesting the name", () => {
    const effects = createRecordingEffects();
    pickSavePathWith(effects);
    expect(effects.calls).toEqual([
      { type: "pickSavePath", suggestedFileName: "Korean.apkg" },
    ]);
  });

  it("reports the path the platform picked", async () => {
    const effects = createRecordingEffects();
    const dispatched = pickSavePathWith(effects);
    effects.resolvePickSavePath({ kind: "path", path: "/decks/Korean.apkg" });
    await vi.waitFor(() =>
      expect(dispatched).toEqual([
        actions.ankiExportPathPicked({
          kind: "path",
          path: "/decks/Korean.apkg",
        }),
      ]),
    );
  });

  it("reports the environment measured with the platform's probes", () => {
    const dispatched: AppAction[] = [];
    const effects = createRecordingEffects();
    screenEffectRunners.measurePlaybackEnvironment(
      {
        type: "measurePlaybackEnvironment",
        mediaFileId: "m1",
        directMimeType: "video/mp4",
        codecStrings: ["avc1.64001F"],
      },
      {
        effects,
        dispatch: (action) => dispatched.push(action),
        timers: createTimerTable(effects.clock),
        requests: createRequestTable(() => {
          throw new Error("No request is expected.");
        }),
      },
    );
    const environment: PlaybackEnvironment = {
      engine: "webkit",
      can_play_type: "maybe",
      mse_codec_strings: ["avc1.64001F", "mp4a.40.2", "fLaC", "avc1.640033"],
    };
    expect(dispatched).toEqual([
      actions.playbackEnvironmentMeasured("m1", environment),
    ]);
  });
});
