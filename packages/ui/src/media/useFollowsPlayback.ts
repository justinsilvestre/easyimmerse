import { useCallback, useEffect, useRef, useState } from "react";

/** How long after its last scroll event a scroll the list started itself still counts as its own. */
const ownScrollSettleMs = 150;

/**
 * Keeps the active item of a scrolling list in view as playback moves on, until the user scrolls it out of view.
 * The active item is the child marked `aria-current`, and `activeKey` changes whenever another item becomes active.
 * Following resumes when the user scrolls the active item back into view, when another item becomes active
 * within view, or through `resume`, which also brings the active item back into view.
 */
export function useFollowsPlayback(activeKey: unknown) {
  const [list, setList] = useState<HTMLElement | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const isFollowingRef = useRef(true);
  const isOwnScrollRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const changeFollowing = useCallback((following: boolean) => {
    isFollowingRef.current = following;
    setIsFollowing(following);
  }, []);

  const settleOwnScrollSoon = useCallback(() => {
    clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      isOwnScrollRef.current = false;
    }, ownScrollSettleMs);
  }, []);

  const scrollToActive = useCallback(() => {
    const active = list?.querySelector<HTMLElement>("[aria-current]");
    if (!active) return;
    isOwnScrollRef.current = true;
    settleOwnScrollSoon();
    active.scrollIntoView({
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [list, settleOwnScrollSoon]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new active item is what calls for a scroll.
  useEffect(() => {
    if (!list) return;
    if (isFollowingRef.current) scrollToActive();
    else if (activeIsVisibleIn(list)) changeFollowing(true);
  }, [activeKey, list, scrollToActive, changeFollowing]);

  useEffect(() => {
    if (!list) return;
    const onScroll = () => {
      if (isOwnScrollRef.current) {
        settleOwnScrollSoon();
        return;
      }
      const following = activeIsVisibleIn(list);
      if (following !== isFollowingRef.current) changeFollowing(following);
    };
    // A wheel or a touch means the user is taking over, even in the middle of a smooth scroll the list started.
    const onUserScrollIntent = () => {
      isOwnScrollRef.current = false;
    };
    list.addEventListener("scroll", onScroll, { passive: true });
    list.addEventListener("wheel", onUserScrollIntent, { passive: true });
    list.addEventListener("touchstart", onUserScrollIntent, { passive: true });
    return () => {
      list.removeEventListener("scroll", onScroll);
      list.removeEventListener("wheel", onUserScrollIntent);
      list.removeEventListener("touchstart", onUserScrollIntent);
    };
  }, [list, settleOwnScrollSoon, changeFollowing]);

  useEffect(() => () => clearTimeout(settleTimerRef.current), []);

  return {
    /** Attach to the scrolling list. */
    listRef: setList,
    /** The scrolling list, once attached. */
    list,
    isFollowing,
    /** Brings the active item back into view and follows playback again. */
    resume: useCallback(() => {
      changeFollowing(true);
      scrollToActive();
    }, [changeFollowing, scrollToActive]),
    /** Follows playback again from the next active item on, without scrolling now. */
    follow: useCallback(() => changeFollowing(true), [changeFollowing]),
  };
}

function activeIsVisibleIn(list: HTMLElement): boolean {
  const active = list.querySelector("[aria-current]");
  if (!active) return true;
  const item = active.getBoundingClientRect();
  const view = list.getBoundingClientRect();
  return item.bottom > view.top && item.top < view.bottom;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
