import { actions, selectPlayer } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import type { RefObject } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { usePlayerSkip } from "../hooks/usePlayerSkip.ts";
import { formatMediaTime } from "./formatMediaTime.ts";
import { PlayerControlsButton } from "./PlayerControlsButton.tsx";
import { PlayerControlsLoop } from "./PlayerControlsLoop.tsx";
import { PlayerControlsSeekBar } from "./PlayerControlsSeekBar.tsx";
import { PlayerControlsSettings } from "./PlayerControlsSettings.tsx";

/**
 * The bar below the media: a seek slider, then play and skip buttons, the time, and the player settings.
 * Skipping moves between cues when there are cues. The fullscreen button acts on the target.
 */
export function PlayerControls({
  cues,
  fullscreenTarget,
}: {
  cues: readonly Cue[] | null;
  fullscreenTarget: RefObject<HTMLElement | null>;
}) {
  return (
    <div className="flex flex-col gap-1 bg-neutral-900 px-3 pt-2 pb-1.5 text-neutral-100">
      <PlayerControlsSeekBar />
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <PlayerControlsTransport cues={cues} />
        <PlayerControlsSettings fullscreenTarget={fullscreenTarget} />
      </div>
    </div>
  );
}

function PlayerControlsTransport({ cues }: { cues: readonly Cue[] | null }) {
  const dispatch = useAppDispatch();
  const skip = usePlayerSkip(cues);
  const hasCues = cues !== null && cues.length > 0;
  const playing = useAppSelector((state) => selectPlayer(state).playing);
  return (
    <div className="flex flex-wrap items-center gap-1">
      <PlayerControlsButton
        icon={hasCues ? "previous" : "back"}
        aria-label={hasCues ? "Previous cue" : "Back 5 seconds"}
        onClick={() => skip("previous")}
      />
      <PlayerControlsButton
        icon={playing ? "pause" : "play"}
        aria-label={playing ? "Pause" : "Play"}
        onClick={() => dispatch(actions.togglePlayRequested())}
      />
      <PlayerControlsButton
        icon={hasCues ? "next" : "forward"}
        aria-label={hasCues ? "Next cue" : "Forward 5 seconds"}
        onClick={() => skip("next")}
      />
      <PlayerControlsTime />
      <PlayerControlsLoop />
    </div>
  );
}

function PlayerControlsTime() {
  const currentTimeMs = useAppSelector(
    (state) => selectPlayer(state).currentTimeMs,
  );
  const durationMs = useAppSelector((state) => selectPlayer(state).durationMs);
  return (
    <span className="px-2 text-sm text-neutral-300 tabular-nums">
      {`${formatMediaTime(currentTimeMs)} / ${formatMediaTime(durationMs ?? 0)}`}
    </span>
  );
}
