import clsx from "clsx";
import { Fragment } from "react";
import { splitIntoTokens } from "./splitIntoTokens.ts";

/**
 * Renders text with every word as a focusable button, so that a word can be looked up by
 * hovering or focusing it and turned into a flashcard by clicking it. Line breaks in the
 * text are kept. Each button carries a `data-word` attribute, so that the dictionary pop-up
 * can tell a press on a word apart from a press elsewhere on the page.
 */
export function TokenizedText({
  text,
  className,
  onWordHovered,
  onWordActivated,
}: {
  text: string;
  className?: string;
  onWordHovered?: (word: string) => void;
  onWordActivated?: (word: string) => void;
}) {
  return (
    <span className={clsx("whitespace-pre-line", className)}>
      {splitIntoTokens(text).map((token) =>
        token.kind === "word" ? (
          <WordButton
            key={token.start}
            word={token.text}
            onHovered={onWordHovered}
            onActivated={onWordActivated}
          />
        ) : (
          <Fragment key={token.start}>{token.text}</Fragment>
        ),
      )}
    </span>
  );
}

function WordButton({
  word,
  onHovered,
  onActivated,
}: {
  word: string;
  onHovered?: (word: string) => void;
  onActivated?: (word: string) => void;
}) {
  return (
    <button
      type="button"
      data-word
      className="rounded-sm hover:bg-blue-600/20 focus:bg-blue-600/20 focus:outline-none"
      onMouseEnter={() => onHovered?.(word)}
      onFocus={() => onHovered?.(word)}
      onClick={() => onActivated?.(word)}
    >
      {word}
    </button>
  );
}
