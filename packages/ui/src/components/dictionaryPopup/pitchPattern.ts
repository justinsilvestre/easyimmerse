import type { PitchPosition } from "@easyimmerse/types";

/** High or low pitch on one mora. */
export type PitchLevel = "H" | "L";

/** Small kana, which share a mora with the kana before them. */
const smallKana = new Set("ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ");

/** Splits a kana reading into morae, the units that Japanese pitch accent is counted in. */
export function splitIntoMorae(reading: string): string[] {
  const morae: string[] = [];
  for (const character of reading) {
    const last = morae.length - 1;
    if (smallKana.has(character) && last >= 0) morae[last] += character;
    else morae.push(character);
  }
  return morae;
}

/**
 * Returns the pitch of each mora, followed by the pitch of a particle after the word.
 * A numeric `position` is the mora after which the pitch drops, with 0 meaning it never drops; a string spells out the levels.
 */
export function pitchPattern(
  position: PitchPosition,
  moraCount: number,
): PitchLevel[] {
  if (typeof position === "string")
    return [...position].map((letter) =>
      letter.toUpperCase() === "H" ? "H" : "L",
    );
  return Array.from({ length: moraCount + 1 }, (_, index) =>
    isHigh(position, index) ? "H" : "L",
  );
}

function isHigh(downstep: number, index: number): boolean {
  if (index === 0) return downstep === 1;
  return downstep === 0 || index < downstep;
}
