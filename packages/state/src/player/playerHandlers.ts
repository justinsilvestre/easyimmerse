import type { UpdateHandlers } from "../updateHandlers.ts";
import { clamp } from "./clamp.ts";
import type { PlayerState } from "./playerState.ts";
import { loopPlayer, seekTimeInFrame, withPlayer } from "./withPlayer.ts";

export const playerHandlers = {
  playerTimeChanged: (state, { ms }) => [
    withPlayer(state, { currentTimeMs: ms }),
    [],
  ],
  playerDurationKnown: (state, { ms }) => [
    withPlayer(state, { durationMs: ms }),
    [],
  ],
  playerPlayingChanged: (state, { playing }) => [
    withPlayer(state, { playing }),
    [],
  ],
  playRequested: (state) => [state, [{ type: "playPlayer" }]],
  pauseRequested: (state) => [state, [{ type: "pausePlayer" }]],
  togglePlayRequested: (state) => [
    state,
    [state.player.playing ? { type: "pausePlayer" } : { type: "playPlayer" }],
  ],
  seekRequested: (state, { ms }) => [state, [{ type: "seekPlayer", ms }]],
  momentSeekRequested: (state, { ms }) => [
    state,
    [{ type: "seekPlayer", ms: seekTimeInFrame(state, ms) }],
  ],
  skipRequested: (state, { deltaMs }) => [
    state,
    [{ type: "seekPlayer", ms: findSkipTarget(state.player, deltaMs) }],
  ],
  playbackRateChanged: (state, { rate }) => [
    withPlayer(state, { playbackRate: rate }),
    [{ type: "setPlaybackRate", rate }],
  ],
  volumeChanged: (state, action) => {
    const volume = clamp(action.volume, 0, 1);
    return [withPlayer(state, { volume }), [{ type: "setVolume", volume }]];
  },
  loopRequested: (state, { range }) => loopPlayer(state, range),
} satisfies Partial<UpdateHandlers>;

function findSkipTarget(player: PlayerState, deltaMs: number): number {
  const end = player.durationMs ?? Number.POSITIVE_INFINITY;
  return clamp(player.currentTimeMs + deltaMs, 0, end);
}
