import type { Cue } from "@easyimmerse/types";
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
 * The player places them, above its controls.
 */
export function SubtitleOverlay({
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
        <p className="pointer-events-auto rounded bg-black/70 px-3 py-1 text-base font-medium text-white md:text-2xl">
          <ClickableText
            text={stripMarkup(targetCue.text)}
            activeWord={activeWordIn(activeWord, targetCue)}
            gestures={gesturesForCue(wordGestures, targetCue)}
          />
        </p>
      )}
      {showsTranslation && translationCue && (
        <p className="pointer-events-auto rounded bg-black/60 px-3 py-0.5 text-sm whitespace-pre-line text-gray-200 md:text-base">
          {stripMarkup(translationCue.text)}
        </p>
      )}
    </div>
  );
}
