import { actions, selectPlayer, selectSubtitles } from "@easyimmerse/state";
import type { RefObject } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { usePlayerFullscreen } from "../hooks/usePlayerFullscreen.ts";
import { PlayerControlsButton } from "./PlayerControlsButton.tsx";
import { PlayerControlsIcon } from "./PlayerControlsIcon.tsx";

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/** Volume, playback speed, which subtitles are overlaid, the subtitles panel, and fullscreen. */
export function PlayerControlsSettings({
  fullscreenTarget,
}: {
  fullscreenTarget: RefObject<HTMLElement | null>;
}) {
  const dispatch = useAppDispatch();
  const { overlay, panelOpen } = useAppSelector(selectSubtitles);
  const { isFullscreen, toggleFullscreen } =
    usePlayerFullscreen(fullscreenTarget);
  const overlayName = overlay === "target" ? "Target" : "Translation";
  return (
    <div className="flex flex-wrap items-center gap-1">
      <PlayerControlsVolume />
      <PlayerControlsSpeed />
      <PlayerControlsButton
        icon="subtitles"
        aria-label={`Overlaid subtitles: ${overlayName}`}
        title="Switch the overlaid subtitles (T)"
        onClick={() => dispatch(actions.subtitleOverlayToggled())}
      >
        {overlayName}
      </PlayerControlsButton>
      <PlayerControlsButton
        icon="panel"
        aria-label="Subtitles panel"
        aria-pressed={panelOpen}
        isActive={panelOpen}
        title="Show or hide the subtitles panel (S)"
        onClick={() => dispatch(actions.subtitlesPanelToggled())}
      />
      <PlayerControlsButton
        icon={isFullscreen ? "exitFullscreen" : "enterFullscreen"}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title="Fullscreen (F)"
        onClick={toggleFullscreen}
      />
    </div>
  );
}

function PlayerControlsVolume() {
  const dispatch = useAppDispatch();
  const volume = useAppSelector((state) => selectPlayer(state).volume);
  return (
    <label className="flex items-center gap-1.5 px-2 text-neutral-200">
      <PlayerControlsIcon name="volume" />
      <input
        type="range"
        aria-label="Volume"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(event) =>
          dispatch(actions.volumeChanged(Number(event.currentTarget.value)))
        }
        className="h-1.5 w-20 cursor-pointer accent-blue-500"
      />
    </label>
  );
}

function PlayerControlsSpeed() {
  const dispatch = useAppDispatch();
  const rate = useAppSelector((state) => selectPlayer(state).playbackRate);
  return (
    <select
      aria-label="Playback speed"
      value={rate}
      onChange={(event) =>
        dispatch(actions.playbackRateChanged(Number(event.currentTarget.value)))
      }
      className="h-9 rounded-md bg-transparent px-2 text-sm text-neutral-200 tabular-nums hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
    >
      {playbackRates.map((option) => (
        <option key={option} value={option} className="bg-neutral-900">
          {`${option}×`}
        </option>
      ))}
    </select>
  );
}
