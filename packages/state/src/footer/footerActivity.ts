import type { NavigationStep } from "../route/route.ts";

/**
 * A long-running action shown in the app footer while the place it belongs to is not on top,
 * such as a dictionary import, a plugin fetch, or flashcard saves that have been pending for a while.
 * A failed activity stays until it is dismissed at its place; the footer only shows it and leads there.
 */
export type FooterActivity = {
  id: string;
  /**
   * What is being done, as a short verb phrase such as "Adding jmdict.zip",
   * or what went wrong, as a short sentence such as "A dictionary could not be added".
   */
  label: string;
  /**
   * The step to the activity's place, with what a click does as the tooltip says it: "Show on the dictionaries page".
   * Null for an activity with no place to show it, which the footer only tells of.
   */
  opens: { step: NavigationStep; label: string } | null;
} & (
  | {
      status: "running";
      /** How much is done, from 0 to 100, or null while it is unknown. */
      percent: number | null;
    }
  | { status: "failed" }
);
