import { actions, selectCurrentTime } from "@easyimmerse/state";
import { useState } from "react";
import { Button } from "../components/Button.tsx";
import { PickFileButton } from "../components/PickFileButton.tsx";
import { PreferenceToggle } from "../components/PreferenceToggle.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { StubPlayer } from "../components/StubPlayer.tsx";
import { SubtitlesPanel } from "../components/SubtitlesPanel.tsx";
import { useWaveformWindows } from "../components/waveform/useWaveformWindows.ts";
import { WaveformStrip } from "../components/waveform/WaveformStrip.tsx";
import {
  clampVisibleSpan,
  computeViewStart,
} from "../components/waveform/waveformGeometry.ts";
import type { FetchWaveformWindow } from "../components/waveform/waveformWindowStore.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/** The stub player has no media, so the strip spans a nominal five minutes until the real player supplies a duration. */
const stubMediaDurationMs = 5 * 60_000;
const initialVisibleSpanMs = 60_000;

/** No waveform route is wired yet, so every window is reported as missing. */
const fetchNoWaveformWindow: FetchWaveformWindow = async () => null;

export function MediaScreen({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  return (
    <ScreenLayout headerActions={<Button onClick={onBack}>Back</Button>}>
      <h1 className="text-xl font-semibold">Project {projectId}</h1>
      <StubPlayer />
      <PlayerWaveform />
      <div className="flex items-center gap-4">
        <PickFileButton />
        <PreferenceToggle />
      </div>
      <SubtitlesPanel />
    </ScreenLayout>
  );
}

/** The waveform strip under the player, following the store's current time. */
function PlayerWaveform() {
  const dispatch = useAppDispatch();
  const currentTimeMs = useAppSelector(selectCurrentTime) * 1000;
  const durationMs = stubMediaDurationMs;
  const [visibleSpanMs, setVisibleSpanMs] = useState(initialVisibleSpanMs);
  const viewStartMs = computeViewStart(
    currentTimeMs,
    visibleSpanMs,
    durationMs,
  );
  const windows = useWaveformWindows(fetchNoWaveformWindow, {
    viewStartMs,
    viewEndMs: viewStartMs + visibleSpanMs,
    focusMs: currentTimeMs,
    durationMs,
  });
  return (
    <WaveformStrip
      durationMs={durationMs}
      currentTimeMs={currentTimeMs}
      windows={windows}
      cues={[]}
      flashcardSegments={[]}
      visibleSpanMs={visibleSpanMs}
      onVisibleSpanChange={(spanMs) =>
        setVisibleSpanMs(clampVisibleSpan(spanMs, durationMs))
      }
      onSeek={(timeMs) => dispatch(actions.seekRequested(timeMs / 1000))}
      onOpenFlashcardSegment={() => undefined}
      onClipEndpointMoved={() => undefined}
      onScreenshotMarkerMoved={() => undefined}
    />
  );
}
