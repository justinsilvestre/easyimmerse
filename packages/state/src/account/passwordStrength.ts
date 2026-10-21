import { commonPasswords } from "./commonPasswords.ts";

/** How hard a password would be to guess, from too short for the server to strong. */
export type PasswordStrengthLevel = "tooShort" | "weak" | "fair" | "strong";

/** An estimate of a password's strength, with what would make it stronger. */
export type PasswordStrength = {
  level: PasswordStrengthLevel;
  /** The level as a number, from 0 when too short to 3 when strong. */
  score: 0 | 1 | 2 | 3;
  /** At most two next steps, none when the password is strong. */
  advice: string[];
};

/** The shortest password the server accepts. */
const minimumLength = 8;

const advice = {
  tooShort: "Use at least eight characters.",
  common:
    "This is a commonly used password; choose something less predictable.",
  predictable:
    "Avoid repeating the same character or a simple sequence such as 1234 or abcd.",
  longer: "Add a longer phrase; length matters more than symbols.",
  varied: "Mix in numbers or punctuation.",
};

const keyboardRows = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

/** Estimates how hard a password would be to guess, weighing its length first and the variety of its characters second. */
export function assessPasswordStrength(password: string): PasswordStrength {
  if (password.length < minimumLength)
    return { level: "tooShort", score: 0, advice: [advice.tooShort] };
  if (commonPasswords.has(password.toLowerCase()))
    return { level: "weak", score: 1, advice: [advice.common] };
  return rateByLengthAndVariety(password);
}

function rateByLengthAndVariety(password: string): PasswordStrength {
  const effectiveLength =
    password.length - countPredictableCharacters(password);
  const varietyPoint = countCharacterKinds(password) >= 3 ? 1 : 0;
  const points =
    effectiveLength < minimumLength
      ? 0
      : lengthPoints(effectiveLength) + varietyPoint;
  if (points >= 2) return { level: "strong", score: 3, advice: [] };
  const steps = [
    effectiveLength < password.length && advice.predictable,
    advice.longer,
    varietyPoint === 0 && advice.varied,
  ].filter((step) => step !== false);
  const level = points === 1 ? "fair" : "weak";
  return { level, score: points === 1 ? 2 : 1, advice: steps.slice(0, 2) };
}

function lengthPoints(effectiveLength: number): number {
  if (effectiveLength >= 16) return 2;
  return effectiveLength >= 12 ? 1 : 0;
}

/** Counts lowercase letters, capitals, digits and everything else as four kinds of character. */
function countCharacterKinds(password: string): number {
  const kinds = [/\p{Ll}/u, /\p{Lu}/u, /\p{Nd}/u, /[^\p{Ll}\p{Lu}\p{Nd}]/u];
  return kinds.filter((kind) => kind.test(password)).length;
}

/**
 * Counts the characters that continue a run of three or more, each one step from the last in the same direction.
 * A step is a repeat, the next or previous letter or digit, or the neighbouring key in a keyboard row.
 * The first character of each run is not counted, so a run adds as much as one character would.
 */
function countPredictableCharacters(password: string): number {
  const characters = [...password.toLowerCase()];
  const predictable = new Set<number>();
  for (const positionOf of [codePosition, keyboardPosition])
    for (const index of indexesInRuns(characters.map(positionOf)))
      predictable.add(index);
  return predictable.size;
}

function codePosition(character: string): number {
  return character.codePointAt(0) ?? 0;
}

function keyboardPosition(character: string): number | null {
  const row = keyboardRows.findIndex((keys) => keys.includes(character));
  const column = keyboardRows[row]?.indexOf(character);
  return column === undefined ? null : row * 100 + column;
}

/** Returns the index of every character after the first in a run of three or more whose positions step by the same -1, 0 or 1. */
function indexesInRuns(positions: (number | null)[]): number[] {
  const steps = positions.map((position, index) =>
    index === 0 ? null : stepBetween(positions[index - 1], position),
  );
  const indexes: number[] = [];
  let stretch: number[] = [];
  for (let index = 1; index <= steps.length; index++) {
    const step = steps[index] ?? null;
    if (step !== null && step === steps[index - 1]) {
      stretch.push(index);
      continue;
    }
    if (stretch.length >= 2) indexes.push(...stretch);
    stretch = step === null ? [] : [index];
  }
  return indexes;
}

function stepBetween(from: number | null, to: number | null): number | null {
  if (from === null || to === null) return null;
  const step = to - from;
  return Math.abs(step) <= 1 ? step : null;
}
