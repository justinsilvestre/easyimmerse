import { actions } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { CuePanel } from "../media/CuePanel.tsx";
import type {
  ActiveCueWord,
  CueWordGestures,
} from "../media/cueWordGestures.ts";
import { findCueAt } from "../media/findCue.ts";
import { SubtitleTrackBar } from "../media/SubtitleTrackBar.tsx";
import type { SubtitleTrackChoices } from "../media/SubtitleTrackChoices.ts";
import type { useMediaSubtitles } from "./useMediaSubtitles.ts";

/** The subtitles panel beside the stage: the track choice above one card per cue of the target-language track. */
export function SubtitlesSidePanel({
  subtitles,
  tracks,
  currentMs,
  flashcardCueIndexes,
  activeWord,
  wordGestures,
}: {
  subtitles: ReturnType<typeof useMediaSubtitles>;
  tracks: SubtitleTrackChoices;
  currentMs: number;
  flashcardCueIndexes: readonly number[];
  /** The word the dictionary pop-up shows. */
  activeWord?: ActiveCueWord;
  wordGestures: CueWordGestures;
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
        activeWord={activeWord}
        onSeek={(ms) => dispatch(actions.seekRequested(ms / 1000))}
        wordGestures={wordGestures}
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
