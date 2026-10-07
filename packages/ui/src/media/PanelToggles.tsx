import { AudioWaveform, Maximize, Minimize, PanelRight } from "lucide-react";
import { IconButton } from "../components/IconButton.tsx";
import type { PlayerCallbacks, PlayerPanelsState } from "./PlayerControls.tsx";

/**
 * The toggles for the subtitles panel, the waveform and fullscreen, each labelled for what it does now.
 * The media screen shows them in the app footer.
 */
export function PanelToggles({
  panels,
  callbacks,
}: {
  panels: PlayerPanelsState;
  callbacks: Pick<
    PlayerCallbacks,
    "onToggleCuePanel" | "onToggleWaveform" | "onToggleFullscreen"
  >;
}) {
  const isCueToggleUnavailable = panels.isCuePanelTakenByEditor === true;
  return (
    <>
      <IconButton
        label="Subtitles panel"
        pressed={panels.cues && !isCueToggleUnavailable}
        aria-disabled={isCueToggleUnavailable || undefined}
        title={
          isCueToggleUnavailable
            ? "Close the flashcard to show the subtitles"
            : panels.cues
              ? "Hide the subtitles panel"
              : "Show the subtitles panel"
        }
        onClick={() => {
          if (!isCueToggleUnavailable) callbacks.onToggleCuePanel();
        }}
      >
        <PanelRight className="size-4" />
      </IconButton>
      <IconButton
        label="Waveform"
        pressed={panels.waveform}
        title={panels.waveform ? "Hide the waveform" : "Show the waveform"}
        onClick={callbacks.onToggleWaveform}
      >
        <AudioWaveform className="size-4" />
      </IconButton>
      {callbacks.onToggleFullscreen && (
        <IconButton
          label={
            panels.isFullscreen
              ? "Leave fullscreen (F)"
              : "Enter fullscreen (F)"
          }
          onClick={callbacks.onToggleFullscreen}
        >
          {panels.isFullscreen ? (
            <Minimize className="size-4" />
          ) : (
            <Maximize className="size-4" />
          )}
        </IconButton>
      )}
    </>
  );
}
