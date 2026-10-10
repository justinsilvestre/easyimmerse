import type { WaveformWindowView } from "@easyimmerse/state";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createWaveformWindowStore,
  waveformWindowRetentionMs,
  waveformWindowRetryMs,
} from "./waveformWindowStore.ts";

const view: WaveformWindowView = {
  viewStartMs: 45_000,
  viewEndMs: 135_000,
  focusMs: 100_000,
  durationMs: 600_000,
};

type Pending = {
  startMs: number;
  resolve: (peaks: Uint8Array | null) => void;
  reject: (error: Error) => void;
};

/** A fetch whose promises the test settles by hand, in any order. */
function controlledFetch() {
  const pending: Pending[] = [];
  const fetchWindow = vi.fn(
    (startMs: number, _endMs: number) =>
      new Promise<Uint8Array | null>((resolve, reject) => {
        pending.push({ startMs, resolve, reject });
      }),
  );
  const settleAll = async (peaks: Uint8Array | null = new Uint8Array(3000)) => {
    for (const request of pending.splice(0)) request.resolve(peaks);
    await Promise.resolve();
  };
  const failAll = async () => {
    for (const request of pending.splice(0))
      request.reject(new Error("offline"));
    await Promise.resolve();
  };
  return { fetchWindow, pending, settleAll, failAll };
}

const requestedStarts = (fetchWindow: ReturnType<typeof vi.fn>) =>
  fetchWindow.mock.calls.map((call) => call[0]);

describe("createWaveformWindowStore", () => {
  it("requests the window holding the focus first", () => {
    const { fetchWindow } = controlledFetch();
    createWaveformWindowStore(fetchWindow).update(view);
    expect(requestedStarts(fetchWindow)[0]).toBe(90_000);
  });

  it("keeps at most three requests in flight", () => {
    const { fetchWindow } = controlledFetch();
    createWaveformWindowStore(fetchWindow).update(view);
    expect(fetchWindow).toHaveBeenCalledTimes(3);
  });

  it("asks for a window's whole 30 seconds", () => {
    const { fetchWindow } = controlledFetch();
    createWaveformWindowStore(fetchWindow).update(view);
    expect(fetchWindow.mock.calls[0]).toEqual([90_000, 120_000]);
  });

  it("ends the last window at the duration", () => {
    const { fetchWindow } = controlledFetch();
    createWaveformWindowStore(fetchWindow).update({
      ...view,
      viewStartMs: 540_000,
      viewEndMs: 590_000,
      focusMs: 580_000,
      durationMs: 590_000,
    });
    expect(fetchWindow.mock.calls[0]).toEqual([570_000, 590_000]);
  });

  it("holds a window once its peaks arrive", async () => {
    const { fetchWindow, settleAll } = controlledFetch();
    const store = createWaveformWindowStore(fetchWindow);
    store.update(view);
    await settleAll();
    expect([...store.getWindows().keys()]).toEqual([90_000, 30_000, 60_000]);
  });

  it("requests the next windows once earlier ones settle", async () => {
    const { fetchWindow, settleAll } = controlledFetch();
    createWaveformWindowStore(fetchWindow).update(view);
    await settleAll();
    expect(requestedStarts(fetchWindow).slice(3)).toEqual([
      120_000, 0, 150_000,
    ]);
  });

  it("notifies subscribers when a window arrives", async () => {
    const { fetchWindow, settleAll } = controlledFetch();
    const store = createWaveformWindowStore(fetchWindow);
    const listener = vi.fn();
    store.subscribe(listener);
    store.update(view);
    await settleAll();
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("does not hold a window whose fetch produced nothing", async () => {
    const { fetchWindow, settleAll } = controlledFetch();
    const store = createWaveformWindowStore(fetchWindow);
    store.update(view);
    await settleAll(null);
    expect(store.getWindows().size).toBe(0);
  });

  it("does not fetch again a window that produced nothing", async () => {
    let clock = 0;
    const { fetchWindow, settleAll } = controlledFetch();
    const store = createWaveformWindowStore(fetchWindow, () => clock);
    store.update(view);
    await settleAll(null);
    await settleAll(null);
    clock = waveformWindowRetryMs;
    store.update(view);
    expect(
      requestedStarts(fetchWindow).filter((s) => s === 90_000),
    ).toHaveLength(1);
  });

  it("moves on to the next windows when fetches fail", async () => {
    const fetchWindow = vi.fn(() => Promise.reject(new Error("offline")));
    const store = createWaveformWindowStore(fetchWindow);
    store.update(view);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchWindow).toHaveBeenCalledTimes(6);
  });

  describe("when a fetch fails", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("does not hold the window", async () => {
      const { fetchWindow, failAll } = controlledFetch();
      const store = createWaveformWindowStore(fetchWindow, () => 0);
      store.update(view);
      await failAll();
      expect(store.getWindows().size).toBe(0);
    });

    it("does not fetch the window again before the retry delay", async () => {
      let clock = 0;
      const { fetchWindow, failAll } = controlledFetch();
      const store = createWaveformWindowStore(fetchWindow, () => clock);
      store.update(view);
      await failAll();
      await failAll();
      clock = waveformWindowRetryMs - 1;
      store.update(view);
      expect(
        requestedStarts(fetchWindow).filter((s) => s === 90_000),
      ).toHaveLength(1);
    });

    it("fetches the window again after the retry delay", async () => {
      let clock = 0;
      const { fetchWindow, failAll } = controlledFetch();
      const store = createWaveformWindowStore(fetchWindow, () => clock);
      store.update(view);
      await failAll();
      await failAll();
      clock = waveformWindowRetryMs;
      store.update(view);
      expect(
        requestedStarts(fetchWindow).filter((s) => s === 90_000),
      ).toHaveLength(2);
    });

    it("fetches the window again once the retry delay passes without the view moving", async () => {
      vi.useFakeTimers();
      let clock = 0;
      const { fetchWindow, failAll } = controlledFetch();
      createWaveformWindowStore(fetchWindow, () => clock).update(view);
      await failAll();
      await failAll();
      clock = waveformWindowRetryMs;
      vi.advanceTimersByTime(waveformWindowRetryMs);
      expect(
        requestedStarts(fetchWindow).filter((s) => s === 90_000),
      ).toHaveLength(2);
    });

    it("holds the window once a later fetch succeeds", async () => {
      let clock = 0;
      const { fetchWindow, failAll, settleAll } = controlledFetch();
      const store = createWaveformWindowStore(fetchWindow, () => clock);
      store.update(view);
      await failAll();
      await failAll();
      clock = waveformWindowRetryMs;
      store.update(view);
      await settleAll();
      expect(store.getWindows().has(90_000)).toBe(true);
    });
  });

  describe("when the view has not wanted a window for a while", () => {
    const farView = {
      ...view,
      viewStartMs: 400_000,
      viewEndMs: 460_000,
      focusMs: 430_000,
    };

    it("forgets the window", async () => {
      let clock = 0;
      const { fetchWindow, settleAll } = controlledFetch();
      const store = createWaveformWindowStore(fetchWindow, () => clock);
      store.update(view);
      await settleAll();
      clock = waveformWindowRetentionMs + 1;
      store.update(farView);
      expect(store.getWindows().has(90_000)).toBe(false);
    });

    it("notifies subscribers that it forgot the window", async () => {
      let clock = 0;
      const { fetchWindow, settleAll } = controlledFetch();
      const store = createWaveformWindowStore(fetchWindow, () => clock);
      store.update(view);
      await settleAll();
      const listener = vi.fn();
      store.subscribe(listener);
      clock = waveformWindowRetentionMs + 1;
      store.update(farView);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  it("ignores results that arrive after it is disposed", async () => {
    const { fetchWindow, settleAll } = controlledFetch();
    const store = createWaveformWindowStore(fetchWindow);
    store.update(view);
    store.dispose();
    await settleAll();
    expect(store.getWindows().size).toBe(0);
  });
});
