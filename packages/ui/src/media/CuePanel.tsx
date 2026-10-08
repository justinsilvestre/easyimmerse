import type { Cue } from "@easyimmerse/types";
import clsx from "clsx";
import { FilePlus, Layers, LocateFixed, Sparkles } from "lucide-react";
import { type KeyboardEvent, type MouseEvent, memo, useMemo } from "react";
import { Button } from "../components/Button.tsx";
import {
  type ActiveWord,
  ClickableText,
  stripMarkup,
} from "../components/ClickableText.tsx";
import { lineStepOfKey } from "../components/cursorKeys.ts";
import { EmptyState } from "../components/EmptyState.tsx";
import { clickableWordAttribute } from "../components/lookupTrigger.ts";
import type { Range } from "../components/RunText.tsx";
import type { TextCursor } from "../components/textCursor.ts";
import { useStableCallbacks } from "../hooks/useStableCallbacks.ts";
import {
  type ItemSpan,
  useVisibleItemSpan,
} from "../hooks/useVisibleItemSpan.ts";
import { type CueTextCursor, cursorIn } from "./cueCursor.ts";
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
 * The collapsible panel with one card per cue, which follows playback.
 * A click anywhere on a card seeks to its cue, except on its words, which keep their own gestures, and on its buttons.
 * Once the user scrolls the current line out of view, the panel stops following and offers a button back to it.
 * From a focused word, Left and Right move the lookup cursor along its cue, and Up and Down move focus to the first word
 * of the previous or next card and seek to its cue, as they do in the subtitles over the video.
 * A card renders again only when its own cue, state or word changes, so that playback and lookups stay quick with many cues;
 * for that, `wordGestures` must keep its identity across renders.
 */
export function CuePanel({
  cues,
  translationCues,
  activeCueIndex,
  flashcardCueIndexes,
  flashcardWordRanges,
  activeWord,
  cursor,
  onSeek,
  wordGestures,
  onAddSubtitlesFile,
  onGenerateSubtitles,
  onOpenFlashcardForCue,
  onVisibleCuesChange,
}: {
  cues: readonly Cue[];
  translationCues: readonly Cue[];
  activeCueIndex: number | null;
  flashcardCueIndexes: readonly number[];
  /**
   * Where each cue's text holds the words that flashcards were made from, by cue index.
   * A card renders again when its own entry changes identity.
   */
  flashcardWordRanges?: ReadonlyMap<number, readonly Range[]>;
  activeWord?: ActiveCueWord;
  /** The lookup cursor of the subtitles, highlighted in the card of the cue it lies in; null when there is none. */
  cursor?: CueTextCursor | null;
  onSeek: (ms: number) => void;
  /** What the user does to the words of each cue. */
  wordGestures: CueWordGestures;
  onAddSubtitlesFile: () => void;
  onGenerateSubtitles: () => void;
  /** Opens the flashcard made from a cue. Without it, a card only marks that it has one. */
  onOpenFlashcardForCue?: (cueIndex: number) => void;
  /** Receives the positions in `cues` of the cards in view, each time they change, and null once the panel is gone. */
  onVisibleCuesChange?: (span: ItemSpan | null) => void;
}) {
  const pairs = useMemo(
    () =>
      cues.map((cue) => ({
        cue,
        translation: findTranslationOf(cue, translationCues),
      })),
    [cues, translationCues],
  );
  const { listRef, list, isFollowing, resume, follow } =
    useFollowsPlayback(activeCueIndex);
  useVisibleItemSpan(list, cues, onVisibleCuesChange);
  const handlers = useStableCallbacks({
    seek: (ms: number) => {
      follow();
      onSeek(ms);
    },
    openFlashcardForCue: (cueIndex: number) =>
      onOpenFlashcardForCue?.(cueIndex),
  });
  const stepCue = (event: KeyboardEvent<HTMLOListElement>) => {
    const step = lineStepOfKey(event);
    const card = (event.target as Element).closest("li");
    if (step === null || !isClickableWord(event.target) || !card) return;
    event.preventDefault();
    const index = [...event.currentTarget.children].indexOf(card);
    const adjacent = pairs[step === "next" ? index + 1 : index - 1];
    const adjacentCard =
      step === "next" ? card.nextElementSibling : card.previousElementSibling;
    if (!adjacent || !adjacentCard) return;
    adjacentCard
      .querySelector<HTMLElement>(`[${clickableWordAttribute}]`)
      ?.focus();
    handlers.seek(adjacent.cue.start_ms);
  };
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
      {/* Up and Down reach here from the focused word of a card, which handles Left and Right itself. */}
      <ol
        ref={listRef}
        aria-label="Subtitles"
        className="flex flex-col gap-1 overflow-y-auto p-2"
        onKeyDown={stepCue}
      >
        {pairs.map(({ cue, translation }) => (
          <CueCard
            key={cue.index}
            cue={cue}
            translation={translation}
            isActive={cue.index === activeCueIndex}
            hasFlashcard={flashcardCueIndexes.includes(cue.index)}
            flashcardWordRanges={
              flashcardWordRanges?.get(cue.index) ?? noRanges
            }
            activeWord={activeWordIn(activeWord, cue)}
            cursor={cursorIn(cursor, cue)}
            onSeek={handlers.seek}
            wordGestures={wordGestures}
            onOpenFlashcardForCue={
              onOpenFlashcardForCue && handlers.openFlashcardForCue
            }
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

const noRanges: readonly Range[] = [];

function isClickableWord(target: EventTarget): boolean {
  return (
    target instanceof Element && target.hasAttribute(clickableWordAttribute)
  );
}

const CueCard = memo(function CueCard({
  cue,
  translation,
  isActive,
  hasFlashcard,
  flashcardWordRanges,
  activeWord,
  cursor,
  onSeek,
  wordGestures,
  onOpenFlashcardForCue,
}: {
  cue: Cue;
  translation: Cue | null;
  isActive: boolean;
  hasFlashcard: boolean;
  flashcardWordRanges: readonly Range[];
  /** The word the pop-up shows, when it lies in this cue. */
  activeWord?: ActiveWord;
  /** The lookup cursor, when it lies in this cue, as `ClickableText` takes it. */
  cursor?: TextCursor | null;
  onSeek: (ms: number) => void;
  /** What the user does to the words of each cue. */
  wordGestures: CueWordGestures;
  onOpenFlashcardForCue?: (cueIndex: number) => void;
}) {
  const seekOnClick = (event: MouseEvent<HTMLLIElement>) => {
    if (event.target instanceof Element && event.target.closest("button"))
      return;
    const selection = window.getSelection();
    if (
      selection !== null &&
      !selection.isCollapsed &&
      event.currentTarget.contains(selection.anchorNode)
    )
      return;
    onSeek(cue.start_ms);
  };
  return (
    // The timestamp button seeks from the keyboard; a click elsewhere on the card is a larger target for the pointer.
    // Words and buttons inside the card keep their own clicks, and a drag that selects text does not seek.
    // biome-ignore lint/a11y/useKeyWithClickEvents: see above
    <li
      aria-current={isActive || undefined}
      onClick={seekOnClick}
      className={clsx(
        "flex cursor-pointer flex-col gap-1 rounded-md border px-3 py-2 text-sm",
        isActive
          ? "border-accent bg-accent-soft"
          : "border-line bg-surface hover:bg-surface-muted",
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
        {hasFlashcard &&
          (onOpenFlashcardForCue ? (
            <button
              type="button"
              aria-label="Open the flashcard"
              title="Open the flashcard"
              onClick={() => onOpenFlashcardForCue(cue.index)}
              className="-my-1 inline-flex items-center rounded p-1 text-accent-fg pointer-coarse:-my-4 pointer-coarse:p-4 hover:bg-surface-strong focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Layers className="size-3" aria-hidden />
            </button>
          ) : (
            <span
              className="flex items-center gap-1 text-accent-fg"
              title="Has a flashcard"
            >
              <Layers className="size-3" aria-label="Has a flashcard" />
            </span>
          ))}
      </div>
      <p className="text-lg">
        <ClickableText
          text={stripMarkup(cue.text)}
          activeWord={activeWord}
          cursor={cursor}
          markedRanges={flashcardWordRanges}
          gestures={gesturesForCue(wordGestures, cue)}
        />
      </p>
      {translation && (
        <p className="text-base whitespace-pre-line text-fg-muted">
          {stripMarkup(translation.text)}
        </p>
      )}
    </li>
  );
});
