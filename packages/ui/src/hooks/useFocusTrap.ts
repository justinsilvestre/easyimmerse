import type { RefObject } from "react";
import { useDocumentListener } from "./useDocumentListener.ts";

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab and Shift+Tab cycling through the focusable elements inside the container, as a modal dialog requires. */
export function useFocusTrap(container: RefObject<HTMLElement | null>) {
  useDocumentListener("keydown", (event) => {
    if (event.key !== "Tab" || container.current === null) return;
    const focusable = Array.from(
      container.current.querySelectorAll<HTMLElement>(focusableSelector),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first === undefined || last === undefined) return;
    const wrapsToFirst = !event.shiftKey && document.activeElement === last;
    const wrapsToLast = event.shiftKey && document.activeElement === first;
    const leavesContainer = !container.current.contains(document.activeElement);
    if (wrapsToFirst || leavesContainer) focusInside(event, first);
    else if (wrapsToLast) focusInside(event, last);
  });
}

function focusInside(event: KeyboardEvent, element: HTMLElement) {
  event.preventDefault();
  element.focus();
}
