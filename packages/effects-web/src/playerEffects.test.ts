import { createPlayerRegistry } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createPlayerEffects } from "./playerEffects.ts";

function registryWithRecorder() {
  const registry = createPlayerRegistry();
  const calls: string[] = [];
  registry.register({
    seek: (seconds) => calls.push(`seek ${seconds}`),
    togglePlay: () => calls.push("togglePlay"),
    setVolume: (volume) => calls.push(`setVolume ${volume}`),
    setSpeed: (speed) => calls.push(`setSpeed ${speed}`),
  });
  return { registry, calls };
}

describe("createPlayerEffects", () => {
  it("seeks the registered player", () => {
    const { registry, calls } = registryWithRecorder();
    createPlayerEffects(registry).seekPlayer(4);
    expect(calls).toEqual(["seek 4"]);
  });

  it("toggles the registered player", () => {
    const { registry, calls } = registryWithRecorder();
    createPlayerEffects(registry).togglePlayer();
    expect(calls).toEqual(["togglePlay"]);
  });

  it("sets the registered player's speed", () => {
    const { registry, calls } = registryWithRecorder();
    createPlayerEffects(registry).setPlayerSpeed(1.5);
    expect(calls).toEqual(["setSpeed 1.5"]);
  });

  it("does nothing without a registered player", () => {
    expect(() =>
      createPlayerEffects(createPlayerRegistry()).setPlayerVolume(0.5),
    ).not.toThrow();
  });
});
