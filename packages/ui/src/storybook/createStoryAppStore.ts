import { backendStoreParts, configureBackend } from "@easyimmerse/backend";
import type { Effects, PlayerRegistry } from "@easyimmerse/state";
import {
  createAppStore,
  createPlayerRegistry,
  createRecordingEffects,
} from "@easyimmerse/state";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";

/** Builds a store for a story, whose player effects act on the mounted player so that the story's controls move real media. */
export function createStoryAppStore() {
  const playerRegistry = createPlayerRegistry();
  const effects: Effects = {
    ...createRecordingEffects(),
    ...createPlayerEffects(playerRegistry),
  };
  configureBackend(createFakeBackendClient(fixtureResponses));
  return { store: createAppStore(effects, backendStoreParts), playerRegistry };
}

function createPlayerEffects(
  registry: PlayerRegistry,
): Pick<
  Effects,
  | "seekPlayer"
  | "playPlayer"
  | "pausePlayer"
  | "setPlayerLoop"
  | "setPlaybackRate"
  | "setVolume"
  | "captureFrame"
> {
  return {
    seekPlayer: (ms) => registry.current()?.seek(ms),
    playPlayer: () => registry.current()?.play(),
    pausePlayer: () => registry.current()?.pause(),
    setPlayerLoop: (loop) => registry.current()?.setLoop(loop),
    setPlaybackRate: (rate) => registry.current()?.setPlaybackRate(rate),
    setVolume: (volume) => registry.current()?.setVolume(volume),
    captureFrame: async () => registry.current()?.captureFrame() ?? null,
  };
}
