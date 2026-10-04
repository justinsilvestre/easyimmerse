import type { Cue } from "@easyimmerse/types";
import clsx from "clsx";
import { ClickableText, stripMarkup } from "../components/ClickableText.tsx";

/** Which subtitles lie over the video: both with the target language on top, or one of them. */
export type SubtitleDisplay = "both" | "target" | "translation";

/** The subtitles drawn over the video, with the words of the target language ready to be looked up. */
export function SubtitleOverlay({
  targetCue,
  translationCue,
  display,
  isRaised,
  activeWord,
  onWordHover,
  onWordClick,
}: {
  targetCue: Cue | null;
  translationCue: Cue | null;
  display: SubtitleDisplay;
  /** Whether the player controls are shown under the subtitles, which then move up out of their way. */
  isRaised: boolean;
  activeWord?: string;
  onWordHover: (word: string) => void;
  onWordClick: (word: string) => void;
}) {
  const showsTarget = display !== "translation" && targetCue !== null;
  const showsTranslation = display !== "target" && translationCue !== null;
  return (
    <div
      className={clsx(
        "pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 px-14 text-center transition-[padding]",
        isRaised ? "pb-24" : "pb-4",
      )}
    >
      {showsTarget && targetCue && (
        <p className="pointer-events-auto rounded bg-black/70 px-3 py-1 text-base font-medium text-white md:text-2xl">
          <ClickableText
            text={stripMarkup(targetCue.text)}
            activeWord={activeWord}
            onWordHover={onWordHover}
            onWordClick={onWordClick}
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
