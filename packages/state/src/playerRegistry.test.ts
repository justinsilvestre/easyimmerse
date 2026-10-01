import { describe, expect, it } from "vitest";
import type { PlayerHandle } from "./playerRegistry.ts";
import { createPlayerRegistry } from "./playerRegistry.ts";

const createHandle = (): PlayerHandle => ({
  seek: () => undefined,
  play: () => undefined,
  pause: () => undefined,
  setLoop: () => undefined,
  setPlaybackRate: () => undefined,
  setVolume: () => undefined,
  captureFrame: async () => null,
});

describe("createPlayerRegistry", () => {
  it("has no current player before one is registered", () => {
    const registry = createPlayerRegistry();
    expect(registry.current()).toBeNull();
  });

  it("returns the registered handle as the current player", () => {
    const registry = createPlayerRegistry();
    const handle = createHandle();
    registry.register(handle);
    expect(registry.current()).toBe(handle);
  });

  it("has no current player after the registered handle unregisters", () => {
    const registry = createPlayerRegistry();
    const unregister = registry.register(createHandle());
    unregister();
    expect(registry.current()).toBeNull();
  });

  it("keeps a newer handle when an older handle unregisters", () => {
    const registry = createPlayerRegistry();
    const unregisterOlder = registry.register(createHandle());
    const newer = createHandle();
    registry.register(newer);
    unregisterOlder();
    expect(registry.current()).toBe(newer);
  });
});
