import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import type { RequestOutcome } from "../../server/serverRequest.ts";
import { updateWaveform } from "./updateWaveform.ts";
import type { WaveformState } from "./waveformState.ts";
import { initialWaveform } from "./waveformState.ts";

const route = { screen: "media", projectId: "p1", mediaFileId: "m1" } as const;

/** Wants the windows 90 s, 30 s, 60 s, 120 s, 0 s and 150 s, in that order. */
const view = {
  viewStartMs: 45_000,
  viewEndMs: 135_000,
  focusMs: 100_000,
  durationMs: 600_000,
};

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

const viewChanged = actions.waveformViewChanged("player", view);

/** The waveform after the player view above and then the given actions. */
const waveformAfter = (...after: AppAction[]): WaveformState =>
  [viewChanged, ...after].reduce(
    (waveform, action) => updateWaveform(waveform, action, route)[0],
    initialWaveform,
  );

/** The first window failed, and every other wanted window has loaded. */
const failedFirst = [
  settled(90_000, failed),
  settled(30_000, loaded(30_000)),
  settled(60_000, loaded(60_000)),
  settled(120_000, loaded(120_000)),
  settled(0, loaded(0)),
  settled(150_000, loaded(150_000)),
];

const effectsOf = (waveform: WaveformState, action: AppAction) =>
  updateWaveform(waveform, action, route)[1];

describe("updateWaveform", () => {
  it("requests the window holding the focus first and two more when the view changes", () => {
    expect(effectsOf(initialWaveform, viewChanged)).toEqual([
      sent(90_000),
      sent(30_000),
      sent(60_000),
    ]);
  });

  it("ends the last window at the duration", () => {
    const end = { viewStartMs: 540_000, viewEndMs: 590_000 };
    const nearEnd = { ...end, focusMs: 580_000, durationMs: 590_000 };
    const [first] = effectsOf(
      initialWaveform,
      actions.waveformViewChanged("player", nearEnd),
    );
    expect(first).toMatchObject({
      request: { startMs: 570_000, endMs: 590_000 },
    });
  });

  it("requests nothing more while three windows are loading", () => {
    expect(effectsOf(waveformAfter(), viewChanged)).toEqual([]);
  });

  it("requests nothing for a view with no duration", () => {
    const empty = actions.waveformViewChanged("player", {
      ...view,
      durationMs: 0,
    });
    expect(effectsOf(initialWaveform, empty)).toEqual([]);
  });

  it("requests the next wanted window once one has loaded", () => {
    expect(effectsOf(waveformAfter(), settled(90_000, loaded(90_000)))).toEqual(
      [sent(120_000)],
    );
  });

  it("does not request a loaded window again", () => {
    const allLoaded = [
      settled(90_000, loaded(90_000)),
      ...failedFirst.slice(1),
    ];
    expect(effectsOf(waveformAfter(...allLoaded), viewChanged)).toEqual([]);
  });

  it("does not request again a window the server found no peaks for", () => {
    const empty: RequestOutcome<"getWaveformWindow"> = {
      ok: true,
      data: { start_ms: 90_000, peaks: [] },
    };
    const settledEmpty = [settled(90_000, empty), ...failedFirst.slice(1)];
    expect(effectsOf(waveformAfter(...settledEmpty), viewChanged)).toEqual([]);
  });

  it("ignores a window it did not request", () => {
    expect(effectsOf(initialWaveform, settled(90_000, loaded(90_000)))).toEqual(
      [],
    );
  });

  describe("when a window fails", () => {
    it("starts its retry timer", () => {
      expect(
        effectsOf(waveformAfter(), settled(90_000, failed)),
      ).toContainEqual({
        type: "startTimer",
        id: "media/m1/waveform/player/90000/retry",
        ms: 5_000,
        action: actions.waveformRetryDue("player", 90_000),
      });
    });

    it("requests the next wanted window in its place", () => {
      expect(
        effectsOf(waveformAfter(), settled(90_000, failed)),
      ).toContainEqual(sent(120_000));
    });

    it("does not request it again before its retry is due", () => {
      expect(effectsOf(waveformAfter(...failedFirst), viewChanged)).toEqual([]);
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
      expect(effectsOf(waveformAfter(...failedFirst), retry)).toEqual([
        sent(90_000),
      ]);
    });
  });

  it("keeps the requests when the view changes but wants nothing new", () => {
    const before = waveformAfter();
    const moved = actions.waveformViewChanged("player", {
      ...view,
      focusMs: 95_000,
    });
    const [waveform] = updateWaveform(before, moved, route);
    expect(waveform.player.requests).toBe(before.player.requests);
  });

  it("requests nothing more once the view is no longer shown", () => {
    const hidden = waveformAfter(actions.waveformViewChanged("player", null));
    expect(effectsOf(hidden, settled(90_000, loaded(90_000)))).toEqual([]);
  });

  it("ignores a retry for a window that has not failed", () => {
    const retry = actions.waveformRetryDue("player", 90_000);
    expect(effectsOf(waveformAfter(), retry)).toEqual([]);
  });

  it("requests a window again once its request was aborted", () => {
    expect(effectsOf(waveformAfter(), settled(90_000, aborted))).toEqual([
      sent(90_000),
    ]);
  });

  it("requests the clip view's windows under their own ids", () => {
    const clipView = actions.waveformViewChanged("clip", view);
    expect(effectsOf(waveformAfter(), clipView)[0]).toMatchObject({
      id: "media/m1/waveform/clip/90000",
    });
  });

  it("keeps the span the user zoomed to", () => {
    const [waveform] = updateWaveform(
      initialWaveform,
      actions.waveformZoomed(120_000),
      route,
    );
    expect(waveform.requestedSpanMs).toBe(120_000);
  });
});
