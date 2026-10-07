/**
 * How long a mouse pointer stays on a word, or on a character of a run, before the word is looked up,
 * to be highlighted and followed by an open pop-up once the lookup answers:
 * long enough that a sweep across the text does not look up every character it passes, and short enough to feel immediate.
 */
export const hoverMs = 40;
/** How long a touch stays on a word before it counts as a held tap. */
export const holdMs = 500;
/**
 * How long after a click a second click still makes a double-click.
 * Operating systems let users set this; 500 ms is the Windows default and about the longest common setting.
 */
export const doubleClickMs = 500;
