import { actions, selectPreference } from "@easyimmerse/state";
import { useEffect } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

export function PreferenceToggle() {
  const dispatch = useAppDispatch();
  const showTranslations =
    useAppSelector(selectPreference("showTranslations")) === "true";
  useEffect(() => {
    dispatch(actions.preferencesLoadRequested());
  }, [dispatch]);
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={showTranslations}
        onChange={() => dispatch(actions.preferenceToggled("showTranslations"))}
      />
      Show translations
    </label>
  );
}
