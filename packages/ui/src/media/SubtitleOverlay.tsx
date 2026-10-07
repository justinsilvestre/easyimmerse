import type { Cue } from "@easyimmerse/types";
import { memo } from "react";
import { ClickableText, stripMarkup } from "../components/ClickableText.tsx";
import {
  type ActiveCueWord,
  activeWordIn,
  type CueWordGestures,
  gesturesForCue,
} from "./cueWordGestures.ts";

/** Which subtitles lie over the video: both with the target language on top, or one of them. */
export type SubtitleDisplay = "both" | "target" | "translation";

/**
 * The subtitles drawn over the video, with the words of the target language ready to be looked up.
 * The player places them, above its controls, inside a stage that is a CSS container:
 * the text grows with the stage's width, so that the words are easy to aim at on a large screen.
 * It renders again only when its props change, so `wordGestures` must keep its identity across renders.
 */
export const SubtitleOverlay = memo(function SubtitleOverlay({
  targetCue,
  translationCue,
  display,
  activeWord,
  wordGestures,
}: {
  targetCue: Cue | null;
  translationCue: Cue | null;
  display: SubtitleDisplay;
  activeWord?: ActiveCueWord;
  wordGestures: CueWordGestures;
}) {
  const showsTarget = display !== "translation" && targetCue !== null;
  const showsTranslation = display !== "target" && translationCue !== null;
  return (
    <div className="pointer-events-none flex flex-col items-center gap-1 text-center">
      {showsTarget && targetCue && (
        <p className="pointer-events-auto rounded bg-black/70 px-3 py-1 text-[clamp(1rem,2.2cqw_+_0.5rem,2.5rem)] font-medium text-white">
          <ClickableText
            text={stripMarkup(targetCue.text)}
            activeWord={activeWordIn(activeWord, targetCue)}
            gestures={gesturesForCue(wordGestures, targetCue)}
          />
        </p>
      )}
      {showsTranslation && translationCue && (
        <p className="pointer-events-auto rounded bg-black/60 px-3 py-0.5 text-[clamp(0.875rem,1.5cqw_+_0.375rem,1.75rem)] whitespace-pre-line text-gray-200">
          {stripMarkup(translationCue.text)}
        </p>
      )}
    </div>
  );
});
