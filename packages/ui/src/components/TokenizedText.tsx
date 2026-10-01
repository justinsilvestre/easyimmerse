import clsx from "clsx";
import { Fragment, type KeyboardEvent } from "react";
import { useRovingTabIndex } from "../hooks/useRovingTabIndex.ts";
import { splitIntoTokens, type TextToken } from "./splitIntoTokens.ts";

/**
 * Renders text with every word as a focusable button, so that a word can be looked up by
 * hovering or focusing it and turned into a flashcard by clicking it. Line breaks in the
 * text are kept. Each button carries a `data-word` attribute, so that the dictionary pop-up
 * can tell a press on a word apart from a press elsewhere on the page.
 * Only one word is in the tab order; the arrow keys, Home, and End move focus between the words.
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
  const tokens = numberWords(splitIntoTokens(text));
  const roving = useRovingTabIndex(countWords(tokens));
  return (
    <span className={clsx("whitespace-pre-line", className)}>
      {tokens.map((token) =>
        token.kind === "word" ? (
          <WordButton
            key={token.start}
            ref={roving.itemRef(token.wordIndex)}
            word={token.text}
            tabIndex={roving.tabIndexOf(token.wordIndex)}
            onFocused={() => roving.handleItemFocused(token.wordIndex)}
            onKeyDown={roving.handleKeyDown}
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

type NumberedToken =
  | (TextToken & { kind: "word"; wordIndex: number })
  | (TextToken & { kind: "other" });

/** Gives each word token its position among the words of the text. */
function numberWords(tokens: TextToken[]): NumberedToken[] {
  let wordCount = 0;
  return tokens.map((token) =>
    token.kind === "word"
      ? { ...token, kind: "word", wordIndex: wordCount++ }
      : { ...token, kind: "other" },
  );
}

function countWords(tokens: NumberedToken[]): number {
  return tokens.filter((token) => token.kind === "word").length;
}

function WordButton({
  ref,
  word,
  tabIndex,
  onFocused,
  onKeyDown,
  onHovered,
  onActivated,
}: {
  ref: (element: HTMLButtonElement | null) => void;
  word: string;
  tabIndex: number;
  onFocused: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
  onHovered?: (word: string) => void;
  onActivated?: (word: string) => void;
}) {
  return (
    <button
      ref={ref}
      type="button"
      data-word
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      className="rounded-sm hover:bg-accent/20 focus:bg-accent/20 focus:outline-none"
      onMouseEnter={() => onHovered?.(word)}
      onFocus={() => {
        onFocused();
        onHovered?.(word);
      }}
      onClick={() => {
        onFocused();
        onActivated?.(word);
      }}
    >
      {word}
    </button>
  );
}
