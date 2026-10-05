import { type KeyboardEvent, useCallback, useState } from "react";

/** A run written without spaces, named by its offset in the text, with the text it holds. */
type Run = { start: number; text: string };

type KeyboardStart = Run & {
  /** Within the run, in UTF-16 code units, always at the start of a character. */
  offset: number;
  /** Whether Left or Right has moved it since the run gained focus, which is when it is worth announcing. */
  hasMoved: boolean;
};

/**
 * The character of a focused run written without spaces that a lookup from the keyboard starts from,
 * which Left and Right move. It starts at the first character each time the run gains focus,
 * and whenever the run's text has changed since, as when a subtitle cue changes under the focused button.
 */
export function useKeyboardStart() {
  const [start, setStart] = useState<KeyboardStart | null>(null);
  const keepWithin = useCallback(
    (runs: readonly Run[]) =>
      setStart((current) =>
        current && !runs.some((run) => isSameRun(current, run))
          ? null
          : current,
      ),
    [],
  );
  const offsetIn = (run: Run): number | null => {
    if (start === null || !isSameRun(start, run)) return null;
    return Math.min(start.offset, lastCharacterStart(run.text));
  };
  return {
    /** The offset within the run that a lookup from the keyboard starts from, or null while the run lacks focus. */
    offsetIn,
    /** What to announce about the start, or nothing until Left or Right has moved it. */
    announcement: (): string => {
      if (!start?.hasMoved) return "";
      const offset = start.offset;
      const character = start.text.slice(
        offset,
        offset + characterLength(start.text, offset),
      );
      return `Looks up from ${character}`;
    },
    focus: (run: Run) => setStart({ ...run, offset: 0, hasMoved: false }),
    blur: (run: Run) =>
      setStart((current) => (isSameRun(current, run) ? null : current)),
    /** Forgets the start once no run among `runs` holds it, as when its button has gone from the page. Stable across renders. */
    keepWithin,
    /** Moves the start on Left or Right without modifiers, and tells whether it did. */
    move: (run: Run, event: KeyboardEvent): boolean => {
      const step = steps[event.key];
      if (step === undefined || hasModifier(event)) return false;
      setStart((current) => ({
        ...run,
        offset: step(
          run.text,
          isSameRun(current, run) ? (current?.offset ?? 0) : 0,
        ),
        hasMoved: true,
      }));
      return true;
    },
  };
}

function isSameRun(start: Run | null, run: Run): boolean {
  return start !== null && start.start === run.start && start.text === run.text;
}

/** Shift with an arrow extends a selection, and the other modifiers belong to the system and the browser. */
function hasModifier(event: KeyboardEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

const steps: Record<string, (text: string, offset: number) => number> = {
  ArrowRight: (text, offset) => {
    const next = offset + characterLength(text, offset);
    return next < text.length ? next : offset;
  },
  ArrowLeft: (text, offset) => {
    if (offset === 0) return 0;
    return isLowSurrogate(text.charCodeAt(offset - 1))
      ? offset - 2
      : offset - 1;
  },
};

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

function lastCharacterStart(text: string): number {
  const last = text.length - 1;
  return last > 0 && isLowSurrogate(text.charCodeAt(last))
    ? last - 1
    : Math.max(last, 0);
}

/** The number of UTF-16 code units of the character at an offset. */
export function characterLength(text: string, offset: number): number {
  return (text.codePointAt(offset) ?? 0) > 0xffff ? 2 : 1;
}
