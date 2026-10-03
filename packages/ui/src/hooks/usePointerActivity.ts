import {
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/** How long the pointer may rest before the player counts as idle. */
const idleMs = 3000;

/** How far from the top of the element the pointer counts as near the top. */
const nearTopPx = 72;

/**
 * Tracks whether the pointer moved over the element lately, and whether it is near the element's top.
 * Players use this to show their controls and header only while they are wanted.
 */
export function usePointerActivity(): {
  isActive: boolean;
  isNearTop: boolean;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
} {
  const [isActive, setActive] = useState(true);
  const [isNearTop, setNearTop] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restartTimer = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setActive(false), idleMs);
  }, []);
  useEffect(() => {
    restartTimer();
    return () => clearTimeout(timer.current);
  }, [restartTimer]);
  return {
    isActive,
    isNearTop,
    onPointerMove: (event) => {
      const { top } = event.currentTarget.getBoundingClientRect();
      setActive(true);
      setNearTop(event.clientY - top < nearTopPx);
      restartTimer();
    },
    onPointerLeave: () => {
      setNearTop(false);
    },
  };
}
