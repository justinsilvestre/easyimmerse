import { lookupStartsIn } from "@easyimmerse/backend";

/**
 * The offsets in a run of a script written without spaces from which a lookup starts, the same that a batch lookup covers:
 * every character but a combining mark, such as a Thai vowel sign, and the start of each stretch of digits.
 */
export function runLookupStarts(run: string): number[] {
  return lookupStartsIn(run);
}

/** The lookup start at or before an offset in a run, so that a combining mark or a digit looks up from the start it belongs to. */
export function runLookupStartAt(run: string, offset: number): number {
  return runLookupStarts(run).findLast((start) => start <= offset) ?? 0;
}

/** Where the text looked up from a start in a run ends before the next start: after its character and any marks on it, or after its digits. */
export function runLookupEnd(run: string, start: number): number {
  return runLookupStarts(run).find((next) => next > start) ?? run.length;
}
