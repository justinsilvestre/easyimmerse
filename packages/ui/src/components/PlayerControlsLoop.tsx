import { actions, selectPlayer } from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { formatMediaTime } from "./formatMediaTime.ts";
import { PlayerControlsButton } from "./PlayerControlsButton.tsx";

/** Shows the range the player repeats, while it repeats one, and stops repeating when clicked. */
export function PlayerControlsLoop() {
  const dispatch = useAppDispatch();
  const loop = useAppSelector((state) => selectPlayer(state).loop);
  if (loop === null) return null;
  const range = `${formatMediaTime(loop.start_ms)}–${formatMediaTime(loop.end_ms)}`;
  return (
    <PlayerControlsButton
      icon="loop"
      isActive
      aria-label={`Stop repeating ${range}`}
      title="Stop repeating"
      onClick={() => dispatch(actions.loopRequested(null))}
      className="bg-blue-500/15 tabular-nums"
    >
      {range}
    </PlayerControlsButton>
  );
}
