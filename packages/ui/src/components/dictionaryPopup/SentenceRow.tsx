import { Languages, Play } from "lucide-react";
import { IconButton } from "../common/IconButton.tsx";

/** What the sentence row offers for the sentence or cue of the word the pop-up shows. */
export type SentenceRowProps = {
  /** Plays the sentence or cue; absent where it has no audio. */
  play?: { label: string; onPlay: () => void };
  /** The sentence's translation, where it has one that is not already on screen, and whether the row shows it. */
  translation?: {
    text: string;
    /** The language of the translation. */
    language: string;
    isShown: boolean;
    onToggle: () => void;
  };
};

/**
 * The thin row above the dictionary pop-up's entries, about the sentence or cue the shown word belongs to:
 * a play button where it has audio, and a translation button where it has a translation that is not already on screen,
 * which shows the translation in the row and hides it again. The row is left out when it would hold neither.
 */
export function SentenceRow({ play, translation }: SentenceRowProps) {
  if (!play && !translation) return null;
  const translationLabel = translation?.isShown
    ? "Hide the translation (T)"
    : "Show the translation (T)";
  return (
    <div className="flex flex-col border-b border-line px-3 py-1">
      <div className="flex items-center gap-1">
        <span className="mr-auto text-xs text-fg-faint">Sentence</span>
        {play && (
          <IconButton label={play.label} onClick={play.onPlay}>
            <Play className="size-4" />
          </IconButton>
        )}
        {translation && (
          <IconButton
            label={translationLabel}
            pressed={translation.isShown}
            onClick={translation.onToggle}
          >
            <Languages className="size-4" />
          </IconButton>
        )}
      </div>
      {translation?.isShown && (
        <p lang={translation.language} className="pb-1 text-sm text-fg">
          {translation.text}
        </p>
      )}
    </div>
  );
}
