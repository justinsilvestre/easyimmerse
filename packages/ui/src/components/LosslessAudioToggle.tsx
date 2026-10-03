import { actions, selectPreference } from "@easyimmerse/state";
import { useEffect, useId } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/** Switches the `losslessAudio` preference, which makes conversions keep audio at full quality. */
export function LosslessAudioToggle() {
  const dispatch = useAppDispatch();
  const hintId = useId();
  const lossless = useAppSelector(selectPreference("losslessAudio")) === "true";
  useEffect(() => {
    dispatch(actions.preferencesLoadRequested());
  }, [dispatch]);
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={lossless}
          aria-describedby={hintId}
          onChange={() => dispatch(actions.preferenceToggled("losslessAudio"))}
        />
        Keep audio lossless when converting
      </label>
      <p id={hintId} className="pl-6 text-xs text-fg-muted">
        Converted audio keeps its full quality but takes more disk space.
      </p>
    </div>
  );
}
