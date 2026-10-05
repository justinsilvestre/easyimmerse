import { actions } from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";

/** Returns a function that counts work as unsaved until it settles, so that the app warns before closing meanwhile. */
export function useUnsavedWorkTracking() {
  const dispatch = useAppDispatch();
  return <T>(work: Promise<T>): Promise<T> => {
    dispatch(actions.unsavedWorkBegan());
    return work.finally(() => dispatch(actions.unsavedWorkEnded()));
  };
}
