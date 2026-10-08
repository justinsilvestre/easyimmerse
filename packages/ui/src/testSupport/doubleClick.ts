import { fireEvent } from "@testing-library/react";

/** Fires what a browser fires for a double-click: two clicks counting up, then dblclick. */
export function doubleClick(element: HTMLElement) {
  fireEvent.click(element, { detail: 1 });
  fireEvent.click(element, { detail: 2 });
  fireEvent.doubleClick(element, { detail: 2 });
}
