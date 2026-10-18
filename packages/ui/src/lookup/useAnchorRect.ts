import type { LookupAnchor } from "@easyimmerse/state";
import { useEffect, useLayoutEffect, useState } from "react";
import { type AnchorRect, anchorOf } from "./placeAtAnchor.ts";

/**
 * Follows where an anchor lies in the viewport. A rectangle is used as it is.
 * An element, found by its id, is measured after every render, and whenever the window resizes,
 * anything scrolls, or the element or one of its ancestors changes size, as subtitles do when the player's controls push them up.
 * Once the element leaves the page, the last place it had is kept. Null until the element has been measured.
 */
export function useAnchorRect(anchor: LookupAnchor | null): AnchorRect | null {
  const elementId =
    anchor !== null && "elementId" in anchor ? anchor.elementId : null;
  const [rect, setRect] = useState<AnchorRect | null>(null);
  // Every render, since the element can move without any event, as when its text changes.
  useLayoutEffect(() => {
    if (elementId !== null) measure(elementId, setRect);
  });
  useEffect(() => {
    if (elementId === null) return;
    const remeasure = () => measure(elementId, setRect);
    window.addEventListener("resize", remeasure);
    document.addEventListener("scroll", remeasure, {
      capture: true,
      passive: true,
    });
    const observer = observeAncestorSizes(
      document.getElementById(elementId),
      remeasure,
    );
    return () => {
      window.removeEventListener("resize", remeasure);
      document.removeEventListener("scroll", remeasure, { capture: true });
      observer?.disconnect();
    };
  }, [elementId]);
  if (anchor === null) return null;
  return "rect" in anchor ? anchor.rect : rect;
}

function measure(
  elementId: string,
  setRect: (update: (previous: AnchorRect | null) => AnchorRect | null) => void,
): void {
  const element = document.getElementById(elementId);
  if (element === null) return;
  const next = anchorOf(element);
  setRect((previous) => (isSameRect(previous, next) ? previous : next));
}

function observeAncestorSizes(
  element: Element | null,
  onChange: () => void,
): ResizeObserver | null {
  if (element === null || typeof ResizeObserver === "undefined") return null;
  const observer = new ResizeObserver(onChange);
  for (let node: Element | null = element; node; node = node.parentElement)
    observer.observe(node, { box: "border-box" });
  return observer;
}

function isSameRect(first: AnchorRect | null, second: AnchorRect): boolean {
  return (
    first !== null &&
    first.top === second.top &&
    first.bottom === second.bottom &&
    first.left === second.left &&
    first.right === second.right
  );
}
