import type { Cue } from "@easyimmerse/types";
import { memo } from "react";
import { ClickableText, stripMarkup } from "../components/ClickableText.tsx";
import type { Range } from "../components/RunText.tsx";
import {
  type ActiveCueWord,
  activeWordIn,
  type CueWordGestures,
  gesturesForCue,
} from "./cueWordGestures.ts";
import type { SubtitleAppearance } from "./subtitleAppearance.ts";
import { subtitleBoxStyles } from "./subtitleBoxStyles.ts";

/** Which subtitles lie over the video: both with the target language on top, or one of them. */
export type SubtitleDisplay = "both" | "target" | "translation";

/**
 * The subtitles drawn over the video, in a box across the whole width of the stage,
 * with the words of the target language ready to be looked up.
 * The box keeps room for two lines of the target language and one of the translation, or only those the display shows,
 * so that its height stays the same from cue to cue.
 * The text sits at the foot of the box, so that a cue longer than that room grows upward over the picture rather than over the controls.
 * The player places it, above its controls, inside a stage that is a CSS container:
 * the text grows with the stage's width, so that the words are easy to aim at on a large screen.
 * The whole box takes the pointer, so that a pointer moving over it on the way to a word stays on the subtitles.
 * It renders again only when its props change, so `wordGestures` must keep its identity across renders.
 */
export const SubtitleOverlay = memo(function SubtitleOverlay({
  targetCue,
  translationCue,
  display,
  appearance,
  flashcardWordRanges,
  activeWord,
  wordGestures,
}: {
  targetCue: Cue | null;
  translationCue: Cue | null;
  display: SubtitleDisplay;
  appearance: SubtitleAppearance;
  /** Where the target cue's text holds the words that flashcards were made from. */
  flashcardWordRanges?: readonly Range[];
  activeWord?: ActiveCueWord;
  wordGestures: CueWordGestures;
}) {
  const showsTarget = display !== "translation";
  const showsTranslation = display !== "target";
  const styles = subtitleBoxStyles(appearance, {
    target: showsTarget ? 2 : 0,
    translation: showsTranslation ? 1 : 0,
  });
  return (
    <div
      data-testid="subtitle-box"
      style={styles.box}
      className="pointer-events-auto flex cursor-auto flex-col items-center justify-end px-4 text-center"
    >
      {showsTarget && targetCue && (
        <p style={styles.target} className="font-medium">
          <ClickableText
            text={stripMarkup(targetCue.text)}
            activeWord={activeWordIn(activeWord, targetCue)}
            markedRanges={flashcardWordRanges}
            gestures={gesturesForCue(wordGestures, targetCue)}
          />
        </p>
      )}
      {showsTranslation && translationCue && (
        <p
          style={styles.translation}
          className="whitespace-pre-line opacity-90"
        >
          {stripMarkup(translationCue.text)}
        </p>
      )}
    </div>
  );
});
