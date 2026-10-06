import { useEffect, useLayoutEffect, useState } from "react";
import { type AnchorRect, anchorOf } from "./placeAtAnchor.ts";

/**
 * Follows where an element lies in the viewport: after every render, and whenever the window resizes,
 * anything scrolls, or the element or one of its ancestors changes size, as subtitles do when the player's controls push them up.
 * Once the element leaves the page, the last place it had is kept. Null until the element has been measured.
 */
export function useAnchorRect(element: Element | null): AnchorRect | null {
  const [rect, setRect] = useState<AnchorRect | null>(null);
  // Every render, since the element can move without any event, as when its text changes.
  useLayoutEffect(() => {
    if (element !== null) measure(element, setRect);
  });
  useEffect(() => {
    if (element === null) return;
    const remeasure = () => measure(element, setRect);
    window.addEventListener("resize", remeasure);
    document.addEventListener("scroll", remeasure, {
      capture: true,
      passive: true,
    });
    const observer = observeAncestorSizes(element, remeasure);
    return () => {
      window.removeEventListener("resize", remeasure);
      document.removeEventListener("scroll", remeasure, { capture: true });
      observer?.disconnect();
    };
  }, [element]);
  return element === null ? null : rect;
}

function measure(
  element: Element,
  setRect: (update: (previous: AnchorRect | null) => AnchorRect | null) => void,
): void {
  if (!element.isConnected) return;
  const next = anchorOf(element);
  setRect((previous) => (isSameRect(previous, next) ? previous : next));
}

function observeAncestorSizes(
  element: Element,
  onChange: () => void,
): ResizeObserver | null {
  if (typeof ResizeObserver === "undefined") return null;
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
