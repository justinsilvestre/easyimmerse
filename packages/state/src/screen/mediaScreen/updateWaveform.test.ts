import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { openWithClip } from "../../flashcards/exampleFlashcards.ts";
import type { RequestOutcome } from "../../server/serverRequest.ts";
import {
  applyToMediaScreen,
  applyToMediaScreenIn,
  mediaScreenAfter,
} from "./mediaScreenTestSupport.ts";
import { mediaFilesListed } from "./playbackTestActions.ts";

/**
 * m1, a file on the server's disk 600 s long, playing at 100 s with the player strip zoomed to 90 s and the waveform panel closed.
 * Once the panel opens, the strip shows 55 s to 145 s and wants the windows 90 s, 30 s, 60 s, 120 s, 0 s and 150 s, in that order.
 */
const playing = [
  mediaFilesListed(),
  actions.playerDurationChanged(600),
  actions.playerTimeChanged(100),
  actions.waveformZoomed(90_000),
];

/** Opens the waveform panel, which shows the player strip. */
const shown = actions.waveformToggled();

/** Moves the time a little, which leaves the strip wanting the same windows. */
const ticked = actions.playerTimeChanged(101);

/** Applies an action to m1's media screen after `playing` and the given earlier actions. */
const apply = (action: AppAction, ...before: AppAction[]) =>
  applyToMediaScreen(action, ...playing, ...before);

const windowRequest = (startMs: number) =>
  ({
    kind: "getWaveformWindow",
    projectId: "p1",
    mediaFileId: "m1",
    startMs,
    endMs: startMs + 30_000,
  }) as const;

const sent = (startMs: number) =>
  ({
    type: "sendRequest",
    id: `media/m1/waveform/player/${startMs}`,
    request: windowRequest(startMs),
  }) as const;

const settled = (
  startMs: number,
  outcome: RequestOutcome<"getWaveformWindow">,
) =>
  actions.requestSettled(
    `media/m1/waveform/player/${startMs}`,
    windowRequest(startMs),
    outcome,
  );

const loaded = (startMs: number): RequestOutcome<"getWaveformWindow"> => ({
  ok: true,
  data: { start_ms: startMs, peaks: [1, 2, 3] },
});

const failed = { ok: false, error: { status: 500, message: "down" } } as const;

const aborted = {
  ok: false,
  error: { status: "ABORTED", message: "aborted" },
} as const;

/** The waveform after the player strip above is shown and then the given actions. */
const waveformAfter = (...after: AppAction[]) =>
  mediaScreenAfter(...playing, shown, ...after).screen.waveform;

/** The first window failed, and every other wanted window has loaded. */
const failedFirst = [
  settled(90_000, failed),
  settled(30_000, loaded(30_000)),
  settled(60_000, loaded(60_000)),
  settled(120_000, loaded(120_000)),
  settled(0, loaded(0)),
  settled(150_000, loaded(150_000)),
];

/** The waveform's effects of an action on the media screen after `playing` and the given earlier actions. */
const effectsOf = (action: AppAction, ...before: AppAction[]) =>
  apply(action, ...before)[1].filter(
    (effect) => "id" in effect && effect.id.includes("/waveform/"),
  );

describe("updateMediaScreen", () => {
  describe("for the waveform", () => {
    it("requests the window holding the focus first and two more once the strip is shown", () => {
      expect(effectsOf(shown)).toEqual([
        sent(90_000),
        sent(30_000),
        sent(60_000),
      ]);
    });

    it("ends the last window at the duration", () => {
      const nearEnd = [
        actions.playerDurationChanged(590),
        actions.playerTimeChanged(580),
      ];
      const [first] = effectsOf(shown, ...nearEnd);
      expect(first).toMatchObject({
        request: { startMs: 570_000, endMs: 590_000 },
      });
    });

    it("requests nothing more while three windows are loading", () => {
      expect(effectsOf(ticked, shown)).toEqual([]);
    });

    it("requests nothing for a file whose length is unknown", () => {
      const [, effects] = applyToMediaScreen(shown, mediaFilesListed());
      expect(effects).toEqual([]);
    });

    it("requests nothing for a file the browser holds", () => {
      const onDisk = playing.slice(1);
      const [, effects] = applyToMediaScreen(shown, ...onDisk);
      expect(effects).toEqual([]);
    });

    it("requests the next wanted window once one has loaded", () => {
      expect(effectsOf(settled(90_000, loaded(90_000)), shown)).toEqual([
        sent(120_000),
      ]);
    });

    it("does not request a loaded window again", () => {
      const allLoaded = [
        settled(90_000, loaded(90_000)),
        ...failedFirst.slice(1),
      ];
      expect(effectsOf(ticked, shown, ...allLoaded)).toEqual([]);
    });

    it("does not request again a window the server found no peaks for", () => {
      const empty: RequestOutcome<"getWaveformWindow"> = {
        ok: true,
        data: { start_ms: 90_000, peaks: [] },
      };
      const settledEmpty = [settled(90_000, empty), ...failedFirst.slice(1)];
      expect(effectsOf(ticked, shown, ...settledEmpty)).toEqual([]);
    });

    it("ignores a window it did not request", () => {
      expect(effectsOf(settled(90_000, loaded(90_000)))).toEqual([]);
    });

    describe("when a window fails", () => {
      it("starts its retry timer", () => {
        expect(effectsOf(settled(90_000, failed), shown)).toContainEqual({
          type: "startTimer",
          id: "media/m1/waveform/player/90000/retry",
          ms: 5_000,
          action: actions.waveformRetryDue("player", 90_000),
        });
      });

      it("requests the next wanted window in its place", () => {
        expect(effectsOf(settled(90_000, failed), shown)).toContainEqual(
          sent(120_000),
        );
      });

      it("does not request it again before its retry is due", () => {
        expect(effectsOf(ticked, shown, ...failedFirst)).toEqual([]);
      });

      it("holds it once a later request succeeds", () => {
        const waveform = waveformAfter(
          ...failedFirst,
          actions.waveformRetryDue("player", 90_000),
          settled(90_000, loaded(90_000)),
        );
        expect(waveform.player.requests[90_000]?.status).toBe("loaded");
      });

      it("requests it again once its retry is due", () => {
        const retry = actions.waveformRetryDue("player", 90_000);
        expect(effectsOf(retry, shown, ...failedFirst)).toEqual([sent(90_000)]);
      });
    });

    it("keeps the requests when the strip moves but wants nothing new", () => {
      const before = mediaScreenAfter(...playing, shown);
      const [next] = applyToMediaScreenIn(before, ticked);
      expect(next.waveform.player.requests).toBe(
        before.screen.waveform.player.requests,
      );
    });

    it("requests nothing more once the strip is hidden", () => {
      const hidden = actions.waveformToggled();
      expect(effectsOf(settled(90_000, loaded(90_000)), shown, hidden)).toEqual(
        [],
      );
    });

    it("ignores a retry for a window that has not failed", () => {
      const retry = actions.waveformRetryDue("player", 90_000);
      expect(effectsOf(retry, shown)).toEqual([]);
    });

    it("requests a window again once its request was aborted", () => {
      expect(effectsOf(settled(90_000, aborted), shown)).toEqual([
        sent(90_000),
      ]);
    });

    it("requests the windows around an open flashcard's clip under their own ids", () => {
      const clip = openWithClip({ start_ms: 100_000, end_ms: 101_000 });
      expect(effectsOf(clip)[0]).toMatchObject({
        id: "media/m1/waveform/clip/90000",
      });
    });

    it("keeps the span the user zoomed to", () => {
      const [screen] = apply(actions.waveformZoomed(120_000));
      expect(screen.waveform.requestedSpanMs).toBe(120_000);
    });
  });
});
