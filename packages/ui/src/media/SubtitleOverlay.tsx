import type { Cue } from "@easyimmerse/types";
import { Languages } from "lucide-react";
import { ClickableText, stripMarkup } from "../components/ClickableText.tsx";
import { IconButton } from "../components/IconButton.tsx";

/** Which subtitles lie over the video: both with the target language on top, or one of them. */
export type SubtitleDisplay = "both" | "target" | "translation";

export function SubtitleOverlay({
  targetCue,
  translationCue,
  display,
  activeWord,
  onWordHover,
  onWordClick,
  onToggleDisplay,
}: {
  targetCue: Cue | null;
  translationCue: Cue | null;
  display: SubtitleDisplay;
  activeWord?: string;
  onWordHover: (word: string) => void;
  onWordClick: (word: string) => void;
  onToggleDisplay: () => void;
}) {
  const showTarget = display !== "translation" && targetCue;
  const showTranslation = display !== "target" && translationCue;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 px-4 pb-4 text-center">
      {showTarget && (
        <p className="pointer-events-auto rounded bg-black/70 px-3 py-1 text-xl font-medium text-white md:text-2xl">
          <ClickableText
            text={targetCue.text}
            activeWord={activeWord}
            onWordHover={onWordHover}
            onWordClick={onWordClick}
          />
        </p>
      )}
      {showTranslation && (
        <p className="pointer-events-auto rounded bg-black/60 px-3 py-0.5 text-base whitespace-pre-line text-gray-200">
          {stripMarkup(translationCue.text)}
        </p>
      )}
      {translationCue && (
        <span className="pointer-events-auto absolute right-2 bottom-2">
          <IconButton
            label="Switch which subtitles are shown"
            onClick={onToggleDisplay}
          >
            <Languages className="size-4" />
          </IconButton>
        </span>
      )}
    </div>
  );
}
