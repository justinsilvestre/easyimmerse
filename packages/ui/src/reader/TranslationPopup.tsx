import { useEffect, useRef } from "react";

/**
 * The translation of the passage a word was held on, in a card that the reader places beside the word.
 * It stays until a press outside it, or Escape, closes it; the press then goes on to do what it does,
 * so that a word pressed beside the card can still be looked up.
 */
export function TranslationPopup({
  text,
  language,
  onClose,
}: {
  text: string;
  /** The language of the translation. */
  language: string;
  onClose: () => void;
}) {
  const card = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    // The press that held the word began before the card opened, so only later presses reach this.
    const onPress = (event: PointerEvent) => {
      if (
        !(event.target instanceof Node) ||
        !card.current?.contains(event.target)
      )
        onCloseRef.current();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("pointerdown", onPress, { capture: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPress, { capture: true });
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return (
    <div
      ref={card}
      role="dialog"
      aria-label="Translation"
      className="w-fit max-w-full self-center rounded-lg border border-line bg-surface px-4 py-3 font-sans text-sm leading-relaxed text-fg shadow-lg"
    >
      <p lang={language}>{text}</p>
    </div>
  );
}
