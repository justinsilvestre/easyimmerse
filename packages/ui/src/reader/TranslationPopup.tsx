import { useEffect, useRef } from "react";

/**
 * The translation of the passage a word was held on, in a card that the reader places beside the word.
 * The store opens and closes it, as `updateReaderScreen` in the state package describes: it stays until the reader moves on,
 * a press lands on the text or the chrome, or Escape or its key closes it.
 */
export function TranslationPopup({
  text,
  language,
}: {
  text: string;
  /** The language of the translation. */
  language: string;
}) {
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Focus moves to the card so that a screen reader announces it, and returns when the card closes,
    // unless a press outside it has since put focus elsewhere.
    const opener = document.activeElement;
    card.current?.focus({ preventScroll: true });
    const cardElement = card.current;
    return () => {
      const isFocusLost =
        document.activeElement === document.body ||
        cardElement?.contains(document.activeElement) === true;
      if (isFocusLost && opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      ref={card}
      role="dialog"
      aria-label="Translation"
      tabIndex={-1}
      className="outline-none w-fit max-w-full self-center rounded-lg border border-line bg-surface px-4 py-3 font-sans text-sm leading-relaxed text-fg shadow-lg"
    >
      <p lang={language}>{text}</p>
    </div>
  );
}
