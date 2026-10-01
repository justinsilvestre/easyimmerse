import type { Cue } from "@easyimmerse/types";
import { type RefObject, useEffect } from "react";
import { findScrollTopToReveal } from "../components/findScrollTopToReveal.ts";
import { useManualScrollPause } from "./useManualScrollPause.ts";

/**
 * Scrolls the list, whenever the current cue changes, just far enough to show the item marked `aria-current`,
 * unless the user scrolled the list a few seconds ago. Returns handlers to spread onto the list.
 * Only the list scrolls, never the page, so that the player stays in sight.
 */
export function useCurrentCueInView(
  listRef: RefObject<HTMLElement | null>,
  currentCue: Cue | null,
) {
  const { isPaused, handlers } = useManualScrollPause();
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector("[aria-current]")?.closest("li");
    if (currentCue === null || !list || !item || isPaused()) return;
    const top = findScrollTopToReveal(item, list);
    if (top !== null && typeof list.scrollTo === "function")
      list.scrollTo({ top, behavior: "smooth" });
  }, [listRef, currentCue, isPaused]);
  return handlers;
}
