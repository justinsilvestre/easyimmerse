import type { RefObject } from "react";
import { useEffect, useRef } from "react";

/** Calls `onDismiss` when the pointer goes down outside the element, as a pop-up closes on a click elsewhere. */
export function useDismissOnOutsidePointer(
  elementRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  isActive: boolean,
): void {
  const latest = useRef(onDismiss);
  latest.current = onDismiss;
  useEffect(() => {
    if (!isActive) return;
    const dismissOutside = (event: PointerEvent) => {
      const element = elementRef.current;
      if (element && !element.contains(event.target as Node)) latest.current();
    };
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [elementRef, isActive]);
}
