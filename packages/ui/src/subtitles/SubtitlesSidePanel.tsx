import { actions } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import type { Range } from "../components/RunText.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { CuePanel } from "../media/CuePanel.tsx";
import type { CueTextCursor } from "../media/cueCursor.ts";
import type {
  ActiveCueWord,
  CueWordGestures,
} from "../media/cueWordGestures.ts";
import { SubtitleTrackBar } from "../media/SubtitleTrackBar.tsx";
import type { SubtitleTrackChoices } from "../media/SubtitleTrackChoices.ts";
import type { ItemSpan } from "../media/useVisibleItemSpan.ts";
import type { useMediaSubtitles } from "./useMediaSubtitles.ts";

/** The subtitles panel beside the stage: the track choice above one card per cue of the target-language track. */
export function SubtitlesSidePanel({
  subtitles,
  tracks,
  languages,
  shownCue,
  flashcardCueIndexes,
  flashcardWordRanges,
  activeWord,
  cursor,
  wordGestures,
  onOpenFlashcardForCue,
  onVisibleCuesChange,
}: {
  subtitles: ReturnType<typeof useMediaSubtitles>;
  tracks: SubtitleTrackChoices;
  /** The project's target and translation languages, which name the track choices. */
  languages: { target: string; translation: string };
  /** The cue the screen shows now, whose card is active. */
  shownCue: Cue | null;
  flashcardCueIndexes: readonly number[];
  /** Where each cue's text holds the words that flashcards were made from, by cue index. */
  flashcardWordRanges?: ReadonlyMap<number, readonly Range[]>;
  /** The word the dictionary pop-up shows. */
  activeWord?: ActiveCueWord;
  /** The lookup cursor of the subtitles, or null when there is none. */
  cursor?: CueTextCursor | null;
  wordGestures: CueWordGestures;
  /** Opens the flashcard made from a cue, from the mark on that cue's card. */
  onOpenFlashcardForCue?: (cueIndex: number) => void;
  /** Receives the positions among the cues of the cards in view, each time they change, and null once the panel is gone. */
  onVisibleCuesChange?: (span: ItemSpan | null) => void;
}) {
  const dispatch = useAppDispatch();
  return (
    <>
      <SubtitleTrackBar
        tracks={tracks}
        languages={languages}
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
        activeCueIndex={shownCue?.index ?? null}
        flashcardCueIndexes={flashcardCueIndexes}
        flashcardWordRanges={flashcardWordRanges}
        activeWord={activeWord}
        cursor={cursor}
        onSeek={(ms) => dispatch(actions.seekRequested(ms / 1000))}
        wordGestures={wordGestures}
        onOpenFlashcardForCue={onOpenFlashcardForCue}
        onVisibleCuesChange={onVisibleCuesChange}
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
