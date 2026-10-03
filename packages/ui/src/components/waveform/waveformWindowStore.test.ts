import { describe, expect, it, vi } from "vitest";
import type { WaveformWindowView } from "./waveformWindowPolicy.ts";
import {
  createWaveformWindowStore,
  waveformWindowRetentionMs,
} from "./waveformWindowStore.ts";

const view: WaveformWindowView = {
  viewStartMs: 45_000,
  viewEndMs: 135_000,
  focusMs: 100_000,
  durationMs: 600_000,
};

type Pending = { startMs: number; resolve: (peaks: Uint8Array | null) => void };

/** A fetch whose promises the test settles by hand, in any order. */
function controlledFetch() {
  const pending: Pending[] = [];
  const fetchWindow = vi.fn(
    (startMs: number, _endMs: number) =>
      new Promise<Uint8Array | null>((resolve) => {
        pending.push({ startMs, resolve });
      }),
  );
  const settleAll = async (peaks: Uint8Array | null = new Uint8Array(3000)) => {
    for (const request of pending.splice(0)) request.resolve(peaks);
    await Promise.resolve();
  };
  return { fetchWindow, pending, settleAll };
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
    const { fetchWindow, settleAll } = controlledFetch();
    const store = createWaveformWindowStore(fetchWindow);
    store.update(view);
    await settleAll(null);
    await settleAll(null);
    store.update(view);
    expect(
      requestedStarts(fetchWindow).filter((s) => s === 90_000),
    ).toHaveLength(1);
  });

  it("treats a failed fetch like an empty one", async () => {
    const fetchWindow = vi.fn(() => Promise.reject(new Error("offline")));
    const store = createWaveformWindowStore(fetchWindow);
    store.update(view);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchWindow).toHaveBeenCalledTimes(6);
  });

  it("forgets a window the view has not wanted for a while", async () => {
    let clock = 0;
    const { fetchWindow, settleAll } = controlledFetch();
    const store = createWaveformWindowStore(fetchWindow, () => clock);
    store.update(view);
    await settleAll();
    clock = waveformWindowRetentionMs + 1;
    store.update({
      ...view,
      viewStartMs: 400_000,
      viewEndMs: 460_000,
      focusMs: 430_000,
    });
    expect(store.getWindows().has(90_000)).toBe(true);
    await settleAll();
    expect(store.getWindows().has(90_000)).toBe(false);
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
