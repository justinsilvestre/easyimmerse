import { type ReaderLocation, selectReadingLocation } from "@easyimmerse/state";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/**
 * Returns the place to open the book at: undefined until it is known, then the last place read, or null for a book not read before.
 * Later reports from the reader leave the result alone, so that reading does not re-render the screen on every scroll.
 */
export function useOpeningLocation(mediaFileId: string) {
  return useAppSelector(selectReadingLocation(mediaFileId), haveSameLoadState);
}

function haveSameLoadState(
  a: ReaderLocation | null | undefined,
  b: ReaderLocation | null | undefined,
): boolean {
  return (a === undefined) === (b === undefined);
}
