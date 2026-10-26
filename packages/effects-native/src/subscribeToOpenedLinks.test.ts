import { describe, expect, it, vi } from "vitest";
import {
  createOpenedLinkSubscription,
  linkOpenedEvent,
} from "./subscribeToOpenedLinks.ts";

function fakeListen() {
  const stop = vi.fn();
  const listenFn = vi.fn(async (_event: string, _handler: () => void) => stop);
  return { listenFn, stop };
}

/** A shell that holds the given links, handing them out one take at a time. */
function fakeTake(...heldLinks: string[]) {
  return vi.fn(async () => heldLinks.shift() ?? null);
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("createOpenedLinkSubscription", () => {
  it("listens for the link-opened event", () => {
    const { listenFn } = fakeListen();
    createOpenedLinkSubscription(listenFn, fakeTake())(() => undefined);
    expect(listenFn.mock.calls[0]?.[0]).toBe(linkOpenedEvent);
  });

  it("calls the listener with a link held from before it listened", async () => {
    const { listenFn } = fakeListen();
    const listener = vi.fn();
    createOpenedLinkSubscription(
      listenFn,
      fakeTake("easyimmerse://library"),
    )(listener);
    await settle();
    expect(listener).toHaveBeenCalledWith("easyimmerse://library");
  });

  it("calls the listener with the link held when the event arrives", async () => {
    const { listenFn } = fakeListen();
    const listener = vi.fn();
    const take = fakeTake();
    createOpenedLinkSubscription(listenFn, take)(listener);
    await settle();
    take.mockResolvedValueOnce("easyimmerse://projects/p1");
    listenFn.mock.calls[0]?.[1]();
    await settle();
    expect(listener).toHaveBeenCalledWith("easyimmerse://projects/p1");
  });

  it("calls the listener with nothing while the shell holds no link", async () => {
    const { listenFn } = fakeListen();
    const listener = vi.fn();
    createOpenedLinkSubscription(listenFn, fakeTake())(listener);
    await settle();
    listenFn.mock.calls[0]?.[1]();
    await settle();
    expect(listener).not.toHaveBeenCalled();
  });

  it("calls the listener with nothing when the shell refuses the command", async () => {
    const { listenFn } = fakeListen();
    const listener = vi.fn();
    const take = vi.fn(async (): Promise<string | null> => {
      throw new Error("refused");
    });
    createOpenedLinkSubscription(listenFn, take)(listener);
    await settle();
    expect(listener).not.toHaveBeenCalled();
  });

  it("stops listening when unsubscribed", async () => {
    const { listenFn, stop } = fakeListen();
    const unsubscribe = createOpenedLinkSubscription(
      listenFn,
      fakeTake(),
    )(() => undefined);
    unsubscribe();
    await settle();
    expect(stop).toHaveBeenCalledOnce();
  });
});
