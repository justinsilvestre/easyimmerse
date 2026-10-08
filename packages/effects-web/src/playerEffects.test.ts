import { createPlayerRegistry } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createPlayerEffects } from "./playerEffects.ts";

function registryWithRecorder() {
  const registry = createPlayerRegistry();
  const calls: string[] = [];
  registry.register({
    seek: (seconds) => calls.push(`seek ${seconds}`),
    togglePlay: () => calls.push("togglePlay"),
    play: () => calls.push("play"),
    pause: () => calls.push("pause"),
    setVolume: (volume) => calls.push(`setVolume ${volume}`),
    setMuted: (isMuted) => calls.push(`setMuted ${isMuted}`),
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

  it("plays the registered player", () => {
    const { registry, calls } = registryWithRecorder();
    createPlayerEffects(registry).playPlayer();
    expect(calls).toEqual(["play"]);
  });

  it("pauses the registered player", () => {
    const { registry, calls } = registryWithRecorder();
    createPlayerEffects(registry).pausePlayer();
    expect(calls).toEqual(["pause"]);
  });

  it("mutes the registered player", () => {
    const { registry, calls } = registryWithRecorder();
    createPlayerEffects(registry).setPlayerMuted(true);
    expect(calls).toEqual(["setMuted true"]);
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
