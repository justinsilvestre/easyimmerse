import { actions, type NavigationStep } from "@easyimmerse/state";
import { useAppDispatch } from "./useAppDispatch.ts";

/** Returns a function that takes a navigation step from where the app is. */
export function useNavigate() {
  const dispatch = useAppDispatch();
  return (step: NavigationStep) => dispatch(actions.navigated(step));
}
