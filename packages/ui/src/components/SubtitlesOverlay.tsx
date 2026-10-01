import type { WordHover } from "@easyimmerse/state";
import {
  actions,
  selectCurrentTimeMs,
  selectSubtitles,
} from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import clsx from "clsx";
import type { ReactNode } from "react";
import { findCueAt } from "../cues/findCueAt.ts";
import { findOverlappingCue } from "../cues/findOverlappingCue.ts";
import { stripCueMarkup } from "../cues/stripCueMarkup.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { TokenizedText } from "./TokenizedText.tsx";

/**
 * Shows the cue at the player's current time, keeping the last cue until the next one starts.
 * Words of the target-language cue can be hovered to look them up and activated to make a flashcard.
 * The translation shows beneath the target, or above it when the overlay is switched to the translation.
 */
export function SubtitlesOverlay({
  targetCues,
  translationCues,
  onWordActivated,
}: {
  targetCues: readonly Cue[] | null;
  translationCues: readonly Cue[] | null;
  onWordActivated: (hover: WordHover) => void;
}) {
  const timeMs = useAppSelector(selectCurrentTimeMs);
  const overlay = useAppSelector((state) => selectSubtitles(state).overlay);
  const targetCue = targetCues && findCueAt(targetCues, timeMs);
  const translationCue = findTranslationCue(translationCues, targetCue, timeMs);
  if (!targetCue && !translationCue) return null;
  const translationOnTop = overlay === "translation";
  const target = targetCue && (
    <SubtitlesOverlayTargetLine
      cue={targetCue}
      isPrimary={!translationOnTop}
      onWordActivated={onWordActivated}
    />
  );
  const translation = translationCue && (
    <SubtitlesOverlayLine isPrimary={translationOnTop}>
      {stripCueMarkup(translationCue.text)}
    </SubtitlesOverlayLine>
  );
  return (
    <section
      aria-label="Overlaid subtitles"
      className="pointer-events-auto flex max-w-3xl flex-col gap-1 rounded-lg bg-black/70 px-4 py-2 text-center text-white shadow-lg backdrop-blur-sm"
    >
      {translationOnTop ? translation : target}
      {translationOnTop ? target : translation}
    </section>
  );
}

/** Pairs the translation with the shown target cue, or follows the time alone when there is no target track. */
function findTranslationCue(
  translationCues: readonly Cue[] | null,
  targetCue: Cue | null,
  timeMs: number,
): Cue | null {
  if (translationCues === null) return null;
  if (targetCue === null) return findCueAt(translationCues, timeMs);
  return findOverlappingCue(translationCues, targetCue);
}

function SubtitlesOverlayTargetLine({
  cue,
  isPrimary,
  onWordActivated,
}: {
  cue: Cue;
  isPrimary: boolean;
  onWordActivated: (hover: WordHover) => void;
}) {
  const dispatch = useAppDispatch();
  const context = stripCueMarkup(cue.text);
  const clip = { start_ms: cue.start_ms, end_ms: cue.end_ms };
  return (
    <SubtitlesOverlayLine isPrimary={isPrimary}>
      <TokenizedText
        text={context}
        onWordHovered={(word) =>
          dispatch(actions.wordHovered({ word, context, clip }))
        }
        onWordActivated={(word) => onWordActivated({ word, context, clip })}
      />
    </SubtitlesOverlayLine>
  );
}

function SubtitlesOverlayLine({
  isPrimary,
  children,
}: {
  isPrimary: boolean;
  children: ReactNode;
}) {
  return (
    <p
      className={clsx(
        "whitespace-pre-line leading-snug",
        isPrimary
          ? "text-lg font-medium sm:text-2xl lg:text-3xl"
          : "text-sm font-light text-white/80 sm:text-lg",
      )}
    >
      {children}
    </p>
  );
}
