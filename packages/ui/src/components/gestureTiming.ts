export { doubleClickMs } from "@easyimmerse/state";

/**
 * How long a mouse pointer stays on a word, or on a character of a run, before the word is looked up,
 * for its highlight to grow to the match and an open pop-up to follow once the lookup answers:
 * long enough that a sweep across the text does not look up every character it passes, and short enough to feel immediate.
 */
export const hoverMs = 40;
/** How long a touch stays on a word before it counts as a held tap. */
export const holdMs = 500;
