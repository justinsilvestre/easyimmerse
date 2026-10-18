import { type RefObject, useEffect, useRef } from "react";
import { lookupTriggerAttribute } from "../components/lookupTrigger.ts";
import { isOutOfReach } from "../hooks/isOutOfReach.ts";

/**
 * Closes a pop-up on a click outside it and not on an element that opens it,
 * and as soon as its screen is made inert beneath another, such as Settings, where it could not be closed.
 * A click closes it only after the clicked control has acted, so that pressing Play while the pop-up is open plays.
 * Clicks are ignored while the pop-up's screen lies beneath another or under a modal dialog.
 * When the pop-up closes, focus returns to where it was when the pop-up opened, if it was inside the pop-up.
 */
export function usePopupDismissal(
  popupRef: RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  // Read before the first commit, since a search field's autoFocus moves focus during the commit.
  const openerRef = useRef<Element | null>(null);
  openerRef.current ??= document.activeElement;
  // The listeners stay attached while the pop-up is open, so that focus is restored only once, when it closes.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const opener = openerRef.current;
    const isActive = () => !isOutOfReach(popupRef.current);
    // Decided as the click sets out, before any handler of the clicked element runs,
    // since a re-render in between may detach that element from the pop-up.
    // A click that began before the pop-up opened, such as the one that opened it, is left alone.
    let outsideClick: Event | null = null;
    const onClickStart = (event: MouseEvent) => {
      outsideClick = isInsideOrTrigger(popupRef.current, event.target)
        ? null
        : event;
    };
    const onClick = (event: MouseEvent) => {
      if (isActive() && event === outsideClick) onCloseRef.current();
    };
    const covered = new MutationObserver(() => {
      if (popupRef.current?.closest("[inert]")) onCloseRef.current();
    });
    covered.observe(document.body, {
      attributes: true,
      attributeFilter: ["inert"],
      subtree: true,
    });
    document.addEventListener("click", onClickStart, { capture: true });
    document.addEventListener("click", onClick);
    return () => {
      covered.disconnect();
      document.removeEventListener("click", onClickStart, { capture: true });
      document.removeEventListener("click", onClick);
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
