import type {
  BatchLookupRequest,
  BatchLookupResponse,
  LookupResponse,
  LookupResult,
} from "@easyimmerse/types";
import { lookupPositions } from "./lookupPositions.ts";

/**
 * Rebuilds, from a batch lookup of `request`, the response that a single lookup would give for one position of one of its texts.
 * `textIndex` is the text's place in the request, and `offset` the position in it, counted in characters (Unicode scalar values).
 * A position that the batch looked up but left out found nothing.
 * Returns null when the batch did not look the position up, or holds no text at `textIndex`.
 */
export function lookupResponseAt(
  request: BatchLookupRequest,
  batch: BatchLookupResponse,
  textIndex: number,
  offset: number,
): LookupResponse | null {
  const text = batch.texts[textIndex];
  if (!text) return null;
  const position = text.positions.find((p) => p.offset === offset);
  const isLookedUp =
    position !== undefined ||
    lookupPositions(request.texts[textIndex] ?? "").includes(offset);
  if (!isLookedUp) return null;
  const results = (position?.results ?? []).flatMap(
    (index) => batch.results[index] ?? [],
  );
  const dictionaryIds = dictionaryIdsOf(results);
  return {
    results,
    kanji: (position?.kanji ?? []).flatMap((index) => batch.kanji[index] ?? []),
    stylesheets: batch.stylesheets.filter((sheet) =>
      dictionaryIds.has(sheet.dictionaryId),
    ),
  };
}

function dictionaryIdsOf(results: readonly LookupResult[]): Set<string> {
  return new Set(
    results.flatMap((result) => result.definitions.map((d) => d.dictionaryId)),
  );
}
