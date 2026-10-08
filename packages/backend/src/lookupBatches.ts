import type { LookupQuery } from "@easyimmerse/types";
import { lookupPositions } from "./lookupPositions.ts";

/** A text to send in a batch lookup, such as a subtitle cue, with its language. */
export type Passage = { language: string; text: string };

/** The most texts one batch lookup may hold. */
const maxBatchTexts = 100;
/** The most characters one text of a batch lookup may hold. */
const maxBatchTextCharacters = 2000;

/**
 * Picks the lookups that a batch lookup of their context would answer:
 * those whose context fits in a batch and whose offset is one of the positions a batch looks up.
 */
export function lookupsInBatchReach(
  lookups: readonly LookupQuery[],
): LookupQuery[] {
  const positions = new Map<string, ReadonlySet<number>>();
  const positionsOf = (context: string) => {
    const known = positions.get(context);
    if (known) return known;
    const found = new Set(lookupPositions(context));
    positions.set(context, found);
    return found;
  };
  return lookups.filter(
    ({ context, offset }) =>
      context !== undefined &&
      offset !== undefined &&
      [...context].length <= maxBatchTextCharacters &&
      positionsOf(context).has(offset),
  );
}

/** Splits passages into batches that a batch lookup can take: each of one language, and none too long. */
export function batchesOf(passages: readonly Passage[]): Passage[][] {
  const byLanguage = Map.groupBy(passages, (passage) => passage.language);
  return [...byLanguage.values()].flatMap((group) =>
    Array.from(
      { length: Math.ceil(group.length / maxBatchTexts) },
      (_, index) =>
        group.slice(index * maxBatchTexts, (index + 1) * maxBatchTexts),
    ),
  );
}

/** Names a passage, so that the passages of many lookups can be told apart. */
export function passageKey({ language, text }: Passage): string {
  return `${language}\n${text}`;
}
