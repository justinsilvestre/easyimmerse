import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import type { MediaScreenState } from "../screenState.ts";
import { updateMediaScreen } from "./updateMediaScreen.ts";

const open = actions.openMediaFileRequested("p1", "m1");
const loaded = (ms: number | null) => actions.playbackPositionLoaded("m1", ms);
const duration = actions.playerDurationChanged(600);

/** Applies an action to the media screen of m1, opened after the given earlier actions and followed by the others. */
const applyAfter = (
  action: AppAction,
  beforeOpening: AppAction[],
  afterOpening: AppAction[],
) => {
  const app = stateAfter(...beforeOpening, open, ...afterOpening);
  return updateMediaScreen(app.screen.main as MediaScreenState, action, app);
};

/** Applies an action to the media screen of m1 after the given earlier actions. */
const apply = (action: AppAction, ...before: AppAction[]) =>
  applyAfter(action, [], before);

describe("updateMediaScreen", () => {
  describe("for the resume seek", () => {
    it("seeks to the stored position once the player reports the duration", () => {
      const [, effects] = apply(duration, loaded(90_000));
      expect(effects).toEqual([{ type: "seekPlayer", seconds: 90 }]);
    });

    it("seeks to the stored position once it loads after the duration", () => {
      const [, effects] = apply(loaded(90_000), duration);
      expect(effects).toEqual([{ type: "seekPlayer", seconds: 90 }]);
    });

    it("waits for the duration before seeking", () => {
      const [, effects] = apply(loaded(90_000));
      expect(effects).toEqual([]);
    });

    it("starts a file never played from the beginning", () => {
      const [, effects] = apply(duration, loaded(null));
      expect(effects).toEqual([]);
    });

    it("starts a file left near its start from the beginning", () => {
      const [, effects] = apply(loaded(4_000), duration);
      expect(effects).toEqual([]);
    });

    it("starts a file left near its end from the beginning", () => {
      const [, effects] = apply(loaded(598_000), duration);
      expect(effects).toEqual([]);
    });

    it("seeks only once, not again when the duration is reported anew", () => {
      const [, effects] = apply(
        actions.playerDurationChanged(601),
        loaded(90_000),
        duration,
      );
      expect(effects).toEqual([]);
    });

    it("clears the pending position once it is used", () => {
      const [screen] = apply(duration, loaded(90_000));
      expect(screen.playing.pendingResumeMs).toBeNull();
    });

    it("keeps the position of the first load when it loads again", () => {
      const [, effects] = apply(duration, loaded(30_000), loaded(90_000));
      expect(effects).toEqual([{ type: "seekPlayer", seconds: 30 }]);
    });

    it("ignores the position of another file", () => {
      const [screen] = apply(actions.playbackPositionLoaded("m2", 90_000));
      expect(screen.playing.pendingResumeMs).toBeNull();
    });

    it("seeks to a position already known when the file opened again", () => {
      const [, effects] = applyAfter(
        duration,
        [open, loaded(90_000), actions.closeMedia()],
        [],
      );
      expect(effects).toEqual([{ type: "seekPlayer", seconds: 90 }]);
    });
  });
});
