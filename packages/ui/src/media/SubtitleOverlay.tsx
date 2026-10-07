import type { Cue } from "@easyimmerse/types";
import { memo } from "react";
import { ClickableText, stripMarkup } from "../components/ClickableText.tsx";
import { type LineStep, lineStepOfKey } from "../components/cursorKeys.ts";
import type { Range } from "../components/RunText.tsx";
import { type CueTextCursor, cursorIn } from "./cueCursor.ts";
import {
  type ActiveCueWord,
  activeWordIn,
  type CueWordGestures,
  gesturesForCue,
} from "./cueWordGestures.ts";
import type { SubtitleAppearance } from "./subtitleAppearance.ts";
import { subtitleBoxStyles } from "./subtitleBoxStyles.ts";
import { useFocusFollowsCue } from "./useFocusFollowsCue.ts";

/** Which subtitles lie over the video: both with the target language on top, or one of them. */
export type SubtitleDisplay = "both" | "target" | "translation";

/**
 * The subtitles of the media screen, in a clear box across the whole width of the stage,
 * with the words of the target language ready to be looked up. `SubtitleBand` draws the backdrop behind it.
 * The box keeps room for two lines of the target language and one of the translation, or only those the display shows,
 * so that its height stays the same from cue to cue.
 * The text sits at the foot of the box, so that a cue longer than that room grows upward over the picture rather than over the controls.
 * The player places it, above its controls, inside a stage that is a CSS container:
 * the text grows with the stage's width, so that the words are easy to aim at on a large screen.
 * The whole box takes the pointer, so that a pointer moving over it on the way to a word stays on the subtitles.
 * From a focused word, Left and Right move the lookup cursor along the cue and Up and Down move to the previous or next cue;
 * focus stays in the subtitles when the cue changes under it.
 * It renders again only when its props change, so `wordGestures` and `onCueStep` must keep their identity across renders.
 */
export const SubtitleOverlay = memo(function SubtitleOverlay({
  targetCue,
  translationCue,
  display,
  appearance,
  flashcardWordRanges,
  activeWord,
  cursor,
  wordGestures,
  onCueStep,
}: {
  targetCue: Cue | null;
  translationCue: Cue | null;
  display: SubtitleDisplay;
  appearance: SubtitleAppearance;
  /** Where the target cue's text holds the words that flashcards were made from. */
  flashcardWordRanges?: readonly Range[];
  activeWord?: ActiveCueWord;
  /** The lookup cursor of the subtitles, highlighted when it lies in the target cue; null when there is none. */
  cursor?: CueTextCursor | null;
  wordGestures: CueWordGestures;
  /** Moves to the previous or next cue, on Up or Down while a word of the target cue has focus. */
  onCueStep?: (cue: Cue, step: LineStep) => void;
}) {
  const focus = useFocusFollowsCue(targetCue?.index);
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
        // Up and Down reach here from the focused word, which handles Left and Right itself.
        <p
          style={styles.target}
          className="font-medium"
          {...focus}
          onKeyDown={(event) => {
            const step = lineStepOfKey(event);
            if (step === null || !onCueStep) return;
            event.preventDefault();
            onCueStep(targetCue, step);
          }}
        >
          <ClickableText
            // Each cue gets buttons of its own, so that focus never stays on a button whose word has changed.
            key={targetCue.index}
            text={stripMarkup(targetCue.text)}
            activeWord={activeWordIn(activeWord, targetCue)}
            cursor={cursorIn(cursor, targetCue)}
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
