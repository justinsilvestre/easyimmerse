import type { PlayerHandle } from "@easyimmerse/state";
import { createPlayerRegistry } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createPlayerEffects } from "./playerEffects.ts";

function createRecordingHandle(calls: string[]): PlayerHandle {
  return {
    seek: (ms) => calls.push(`seek ${ms}`),
    play: () => calls.push("play"),
    pause: () => calls.push("pause"),
    setLoop: (range) => calls.push(`loop ${range?.start_ms ?? "off"}`),
    setPlaybackRate: (rate) => calls.push(`rate ${rate}`),
    setVolume: (volume) => calls.push(`volume ${volume}`),
    captureFrame: () => "data:image/png;base64,AA",
  };
}

function createRegisteredEffects() {
  const calls: string[] = [];
  const registry = createPlayerRegistry();
  registry.register(createRecordingHandle(calls));
  return { calls, effects: createPlayerEffects(registry) };
}

describe("createPlayerEffects", () => {
  it("passes each call on to the registered player", () => {
    const { calls, effects } = createRegisteredEffects();
    effects.seekPlayer(1500);
    effects.playPlayer();
    effects.pausePlayer();
    effects.setPlayerLoop({ start_ms: 100, end_ms: 200 });
    effects.setPlaybackRate(0.5);
    effects.setVolume(0.25);
    expect(calls).toEqual([
      "seek 1500",
      "play",
      "pause",
      "loop 100",
      "rate 0.5",
      "volume 0.25",
    ]);
  });

  it("captures the registered player's frame", async () => {
    const { effects } = createRegisteredEffects();
    expect(await effects.captureFrame()).toBe("data:image/png;base64,AA");
  });

  it("captures no frame while no player is registered", async () => {
    const effects = createPlayerEffects(createPlayerRegistry());
    expect(await effects.captureFrame()).toBeNull();
  });
});
