import { selectLookupCursor } from "@easyimmerse/state";
import { useMemo } from "react";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { selectCursorMatchedLength } from "../lookup/selectCursorMatchedLength.ts";
import { type CueTextCursor, cuePositionOf } from "./cueCursor.ts";

/**
 * The lookup cursor's place in the subtitles, highlighted at once when its word's lookup is cached,
 * as one object while its place and length stay the same.
 */
export function useCuePosition(): CueTextCursor | null {
  const cursor = useAppSelector((state) => selectLookupCursor(state.app));
  const matchedLength = useAppSelector(selectCursorMatchedLength);
  const { cueIndex, start, input } = cuePositionOf(cursor, matchedLength) ?? {};
  return useMemo(() => {
    if (cueIndex === undefined || start === undefined || input === undefined)
      return null;
    return matchedLength === undefined
      ? { cueIndex, start, input }
      : { cueIndex, start, input, matchedLength };
  }, [cueIndex, start, input, matchedLength]);
}
