import { type KeyboardEvent, useState } from "react";

/**
 * The character of a focused run written without spaces that a lookup from the keyboard starts from,
 * which Left and Right move. It starts at the first character each time the run gains focus.
 * Runs are named by their offset in the text; offsets within a run count UTF-16 code units, always at the start of a character.
 */
export function useKeyboardStart() {
  const [start, setStart] = useState<{ run: number; offset: number } | null>(
    null,
  );
  return {
    /** The offset within the run that a lookup from the keyboard starts from, or null while the run lacks focus. */
    offsetIn: (run: number): number | null =>
      start?.run === run ? start.offset : null,
    focus: (run: number) => setStart({ run, offset: 0 }),
    blur: (run: number) =>
      setStart((current) => (current?.run === run ? null : current)),
    /** Moves the start on Left or Right, and tells whether the key was one of them. */
    move: (run: number, text: string, event: KeyboardEvent): boolean => {
      const step = steps[event.key];
      if (step === undefined) return false;
      setStart((current) => ({
        run,
        offset: step(text, current?.run === run ? current.offset : 0),
      }));
      return true;
    },
  };
}

const steps: Record<string, (text: string, offset: number) => number> = {
  ArrowRight: (text, offset) => {
    const next = offset + characterLength(text, offset);
    return next < text.length ? next : offset;
  },
  ArrowLeft: (text, offset) => {
    if (offset === 0) return 0;
    const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff;
    return isLowSurrogate(text.charCodeAt(offset - 1))
      ? offset - 2
      : offset - 1;
  },
};

/** The number of UTF-16 code units of the character at an offset. */
export function characterLength(text: string, offset: number): number {
  return (text.codePointAt(offset) ?? 0) > 0xffff ? 2 : 1;
}
