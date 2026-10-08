import type {
  BatchLookupResponse,
  LookupResponse,
  LookupResult,
} from "@easyimmerse/types";

/**
 * Rebuilds, from a batch lookup, the response that a single lookup would give for one position of one of its texts.
 * `textIndex` is the text's place in the batch request, and `offset` the position in it, counted in characters (Unicode scalar values).
 * A position the batch left out found nothing. Returns null when the batch holds no text at `textIndex`.
 */
export function lookupResponseAt(
  batch: BatchLookupResponse,
  textIndex: number,
  offset: number,
): LookupResponse | null {
  const text = batch.texts[textIndex];
  if (!text) return null;
  const position = text.positions.find((p) => p.offset === offset);
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
