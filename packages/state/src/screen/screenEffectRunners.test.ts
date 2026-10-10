import type { PlaybackEnvironment } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import { createRequestTable } from "../server/requestTable.ts";
import { createTimerTable } from "../timers/timerTable.ts";
import { screenEffectRunners } from "./screenEffectRunners.ts";

describe("screenEffectRunners", () => {
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
