import {
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/** How long the pointer may rest before the player counts as idle. */
const idleMs = 3000;

/** Tracks whether the pointer moved over the element lately. Players use this to show their controls only while they are wanted. */
export function usePointerActivity(): {
  isActive: boolean;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
} {
  const [isActive, setActive] = useState(true);
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
    onPointerMove: () => {
      setActive(true);
      restartTimer();
    },
  };
}
