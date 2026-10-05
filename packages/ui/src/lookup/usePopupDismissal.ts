import { type RefObject, useEffect, useRef } from "react";

/** Marks an element that opens the pop-up, such as a word in the subtitles, so that pressing it does not also close the pop-up. */
export const lookupTriggerAttribute = "data-lookup-trigger";

/**
 * Closes a pop-up on Escape, or when the pointer goes down outside it and not on an element that opens it.
 * When the pop-up closes, focus returns to where it was when the pop-up opened, if it was inside the pop-up.
 */
export function usePopupDismissal(
  popupRef: RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  // The listeners stay attached while the pop-up is open, so that focus is restored only once, when it closes.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const opener = document.activeElement;
    const onPointerDown = (event: PointerEvent) => {
      if (!isInsideOrTrigger(popupRef.current, event.target))
        onCloseRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      restoreFocus(popupRef.current, opener);
    };
  }, [popupRef]);
}

function isInsideOrTrigger(
  popup: HTMLElement | null,
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) return false;
  return (
    popup?.contains(target) === true ||
    target.closest(`[${lookupTriggerAttribute}]`) !== null
  );
}

function restoreFocus(popup: HTMLElement | null, opener: Element | null) {
  const focusIsLost =
    document.activeElement === document.body ||
    popup?.contains(document.activeElement) === true;
  if (focusIsLost && opener instanceof HTMLElement && opener.isConnected)
    opener.focus();
}
