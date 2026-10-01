import type { Theme } from "@easyimmerse/state";
import { actions } from "@easyimmerse/state";
import { useLayoutEffect } from "react";
import { useAppDispatch } from "./useAppDispatch.ts";

/** Keeps the store's system theme in step with the operating system's light or dark setting. */
export function useTrackSystemTheme() {
  const dispatch = useAppDispatch();
  useLayoutEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const report = () =>
      dispatch(actions.systemThemeChanged(toTheme(query.matches)));
    report();
    query.addEventListener("change", report);
    return () => query.removeEventListener("change", report);
  }, [dispatch]);
}

function toTheme(prefersDark: boolean): Theme {
  return prefersDark ? "dark" : "light";
}
