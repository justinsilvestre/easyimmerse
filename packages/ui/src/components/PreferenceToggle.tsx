import type { PreferenceKey } from "@easyimmerse/state";
import { actions, selectPreference } from "@easyimmerse/state";
import { useId } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/** A checkbox that switches a true-or-false preference, with an optional hint beneath it. */
export function PreferenceToggle({
  preferenceKey,
  label,
  hint,
}: {
  preferenceKey: PreferenceKey;
  label: string;
  hint?: string;
}) {
  const dispatch = useAppDispatch();
  const hintId = useId();
  const checked = useAppSelector(selectPreference(preferenceKey)) === "true";
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          aria-describedby={hint === undefined ? undefined : hintId}
          onChange={() => dispatch(actions.preferenceToggled(preferenceKey))}
        />
        {label}
      </label>
      {hint !== undefined && (
        <p id={hintId} className="pl-6 text-xs text-fg-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
