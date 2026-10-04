import { actions } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { CuePanel } from "../media/CuePanel.tsx";
import { findCueAt } from "../media/findCue.ts";
import type { TrackSelection } from "../media/playback.ts";
import { SubtitleTrackBar } from "../media/SubtitleTrackBar.tsx";
import type { useMediaSubtitles } from "./useMediaSubtitles.ts";

/** The subtitles panel beside the stage: the track choice above one card per cue of the target-language track. */
export function SubtitlesSidePanel({
  subtitles,
  tracks,
  currentMs,
  flashcardCueIndexes,
  onWordClick,
}: {
  subtitles: ReturnType<typeof useMediaSubtitles>;
  tracks: TrackSelection;
  currentMs: number;
  flashcardCueIndexes: readonly number[];
  onWordClick: (word: string) => void;
}) {
  const dispatch = useAppDispatch();
  const activeCue: Cue | null = findCueAt(subtitles.cues, currentMs);
  return (
    <>
      <SubtitleTrackBar
        tracks={tracks}
        onTargetChange={(trackId) => subtitles.choose("target", trackId)}
        onTranslationChange={(trackId) =>
          subtitles.choose("translation", trackId)
        }
        onAddFile={subtitles.requestFile}
      />
      {subtitles.hasFailed && (
        <p role="alert" className="px-3 py-2 text-sm text-danger-fg">
          The subtitles could not be loaded.
        </p>
      )}
      <CuePanel
        cues={subtitles.cues}
        translationCues={subtitles.translationCues}
        activeCueIndex={activeCue?.index ?? null}
        flashcardCueIndexes={flashcardCueIndexes}
        onSeek={(ms) => dispatch(actions.seekRequested(ms / 1000))}
        onWordHover={() => undefined}
        onWordClick={onWordClick}
        onAddSubtitlesFile={subtitles.requestFile}
        onGenerateSubtitles={() =>
          dispatch(
            actions.notificationRequested(
              "Generating subtitles is not available yet.",
            ),
          )
        }
      />
    </>
  );
}
