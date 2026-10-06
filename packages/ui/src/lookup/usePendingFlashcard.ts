import { useEffect, useRef, useState } from "react";

/**
 * A flashcard waiting for its word's lookup. Only the latest one can finish:
 * starting another, cancelling, or unmounting drops the one before.
 */
export function usePendingFlashcard() {
  const [term, setTerm] = useState<string | null>(null);
  const latest = useRef(0);
  useEffect(
    () => () => {
      latest.current += 1;
    },
    [],
  );
  return {
    /** The word whose flashcard is waiting, or null. */
    term,
    isPending: () => term !== null,
    /** Waits for `results`, then calls `finish` with them, unless something overtook the flashcard first. */
    start<T>(word: string, results: Promise<T>, finish: (value: T) => void) {
      const mine = ++latest.current;
      setTerm(word);
      results.then((value) => {
        if (latest.current !== mine) return;
        setTerm(null);
        finish(value);
      });
    },
    cancel() {
      latest.current += 1;
      setTerm(null);
    },
  };
}
