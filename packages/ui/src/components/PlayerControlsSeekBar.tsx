import { actions, selectPlayer } from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { formatMediaTime } from "./formatMediaTime.ts";

/** A slider over the whole media that requests a seek to the position chosen. */
export function PlayerControlsSeekBar() {
  const dispatch = useAppDispatch();
  const currentTimeMs = useAppSelector(
    (state) => selectPlayer(state).currentTimeMs,
  );
  const durationMs = useAppSelector((state) => selectPlayer(state).durationMs);
  return (
    <input
      type="range"
      aria-label="Seek"
      aria-valuetext={formatMediaTime(currentTimeMs)}
      min={0}
      max={durationMs ?? 0}
      step={100}
      value={currentTimeMs}
      disabled={durationMs === null}
      onChange={(event) =>
        dispatch(actions.seekRequested(Number(event.currentTarget.value)))
      }
      className="h-1.5 w-full cursor-pointer accent-blue-500 disabled:cursor-default"
    />
  );
}
