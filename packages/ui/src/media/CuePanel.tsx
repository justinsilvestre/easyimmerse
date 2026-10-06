import type { Cue } from "@easyimmerse/types";
import clsx from "clsx";
import { FilePlus, Layers, LocateFixed, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Button } from "../components/Button.tsx";
import { ClickableText, stripMarkup } from "../components/ClickableText.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import {
  type ActiveCueWord,
  activeWordIn,
  type CueWordGestures,
  gesturesForCue,
} from "./cueWordGestures.ts";
import { findTranslationOf } from "./findCue.ts";
import { formatTimestamp } from "./formatTimestamp.ts";
import { useFollowsPlayback } from "./useFollowsPlayback.ts";

/**
 * The collapsible panel with one card per cue, which seeks on click and follows playback.
 * Once the user scrolls the current line out of view, the panel stops following and offers a button back to it.
 */
export function CuePanel({
  cues,
  translationCues,
  activeCueIndex,
  flashcardCueIndexes,
  activeWord,
  onSeek,
  wordGestures,
  onAddSubtitlesFile,
  onGenerateSubtitles,
}: {
  cues: readonly Cue[];
  translationCues: readonly Cue[];
  activeCueIndex: number | null;
  flashcardCueIndexes: readonly number[];
  activeWord?: ActiveCueWord;
  onSeek: (ms: number) => void;
  /** What the user does to the words of each cue. */
  wordGestures: CueWordGestures;
  onAddSubtitlesFile: () => void;
  onGenerateSubtitles: () => void;
}) {
  const pairs = useMemo(
    () =>
      cues.map((cue) => ({
        cue,
        translation: findTranslationOf(cue, translationCues),
      })),
    [cues, translationCues],
  );
  const { listRef, isFollowing, resume, follow } =
    useFollowsPlayback(activeCueIndex);
  if (cues.length === 0) {
    return (
      <div className="p-3">
        <EmptyState
          title="No subtitles"
          description="Add a subtitles file, or have them generated from the audio."
          actions={
            <>
              <Button onClick={onAddSubtitlesFile}>
                <FilePlus className="size-4" aria-hidden />
                Add a file
              </Button>
              <Button variant="primary" onClick={onGenerateSubtitles}>
                <Sparkles className="size-4" aria-hidden />
                Generate
              </Button>
            </>
          }
        />
      </div>
    );
  }
  return (
    <div className="relative flex min-h-0 flex-col">
      <ol
        ref={listRef}
        aria-label="Subtitles"
        className="flex flex-col gap-1 overflow-y-auto p-2"
      >
        {pairs.map(({ cue, translation }) => (
          <CueCard
            key={cue.index}
            cue={cue}
            translation={translation}
            isActive={cue.index === activeCueIndex}
            hasFlashcard={flashcardCueIndexes.includes(cue.index)}
            activeWord={activeWord}
            onSeek={(ms) => {
              follow();
              onSeek(ms);
            }}
            wordGestures={wordGestures}
          />
        ))}
      </ol>
      {!isFollowing && activeCueIndex !== null && (
        <button
          type="button"
          onClick={resume}
          className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-medium whitespace-nowrap text-on-accent shadow-lg hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <LocateFixed className="size-4" aria-hidden />
          Back to current line
        </button>
      )}
    </div>
  );
}

function CueCard({
  cue,
  translation,
  isActive,
  hasFlashcard,
  activeWord,
  onSeek,
  wordGestures,
}: {
  cue: Cue;
  translation: Cue | null;
  isActive: boolean;
  hasFlashcard: boolean;
  activeWord?: ActiveCueWord;
  onSeek: (ms: number) => void;
  /** What the user does to the words of each cue. */
  wordGestures: CueWordGestures;
}) {
  return (
    <li
      aria-current={isActive || undefined}
      className={clsx(
        "flex flex-col gap-1 rounded-md border px-3 py-2 text-sm",
        isActive ? "border-accent bg-accent-soft" : "border-line bg-surface",
      )}
    >
      <div className="flex items-center gap-2 text-xs text-fg-faint">
        <button
          type="button"
          aria-label={`Play from ${formatTimestamp(cue.start_ms)}`}
          onClick={() => onSeek(cue.start_ms)}
          className="rounded tabular-nums hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
        >
          {formatTimestamp(cue.start_ms)}
        </button>
        {hasFlashcard && (
          <span
            className="flex items-center gap-1 text-accent-fg"
            title="Has a flashcard"
          >
            <Layers className="size-3" aria-label="Has a flashcard" />
          </span>
        )}
      </div>
      <p className="text-base">
        <ClickableText
          text={stripMarkup(cue.text)}
          activeWord={activeWordIn(activeWord, cue)}
          gestures={gesturesForCue(wordGestures, cue)}
        />
      </p>
      {translation && (
        <p className="whitespace-pre-line text-fg-muted">
          {stripMarkup(translation.text)}
        </p>
      )}
    </li>
  );
}
