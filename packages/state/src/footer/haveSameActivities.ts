import type { FooterActivity } from "./footerActivity.ts";

/**
 * Tells whether two lists hold activities of the same content in the same order.
 * It lets a selector that reads the whole server cache keep its result while the activities it gives stay the same.
 */
export function haveSameActivities(
  first: readonly FooterActivity[],
  second: readonly FooterActivity[],
): boolean {
  return (
    first.length === second.length &&
    first.every(
      (activity, index) =>
        JSON.stringify(activity) === JSON.stringify(second[index]),
    )
  );
}
