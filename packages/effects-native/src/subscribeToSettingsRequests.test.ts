import { describe, expect, it, vi } from "vitest";
import {
  createSettingsRequestSubscription,
  openSettingsEvent,
} from "./subscribeToSettingsRequests.ts";

function fakeListen() {
  const stop = vi.fn();
  const listenFn = vi.fn(async (_event: string, _handler: () => void) => stop);
  return { listenFn, stop };
}

describe("createSettingsRequestSubscription", () => {
  it("listens for the open-settings event", () => {
    const { listenFn } = fakeListen();
    createSettingsRequestSubscription(listenFn)(() => undefined);
    expect(listenFn.mock.calls[0]?.[0]).toBe(openSettingsEvent);
  });

  it("calls the listener when the event arrives", () => {
    const { listenFn } = fakeListen();
    const listener = vi.fn();
    createSettingsRequestSubscription(listenFn)(listener);
    listenFn.mock.calls[0]?.[1]();
    expect(listener).toHaveBeenCalledOnce();
  });

  it("stops listening when unsubscribed", async () => {
    const { listenFn, stop } = fakeListen();
    const unsubscribe = createSettingsRequestSubscription(listenFn)(
      () => undefined,
    );
    unsubscribe();
    await Promise.resolve();
    expect(stop).toHaveBeenCalledOnce();
  });
});
