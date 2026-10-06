import { actions } from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";

/** Counts work that closing the app would lose, so that the app warns before closing meanwhile. */
export function useUnsavedWorkTracking() {
  const dispatch = useAppDispatch();
  /** Counts work from now until the returned release is called; calling it again does nothing. */
  const hold = () => {
    dispatch(actions.unsavedWorkBegan());
    let isHeld = true;
    return () => {
      if (!isHeld) return;
      isHeld = false;
      dispatch(actions.unsavedWorkEnded());
    };
  };
  return {
    hold,
    /** Counts work until it settles. */
    track: <T>(work: Promise<T>): Promise<T> => work.finally(hold()),
  };
}
