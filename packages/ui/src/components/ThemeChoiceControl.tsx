import {
  actions,
  selectThemeChoice,
  type ThemeChoice,
  themeChoices,
} from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { SegmentedControl } from "./SegmentedControl.tsx";

const choiceLabels: Record<ThemeChoice, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

/**
 * The segmented control that picks the app's theme: the system's, or the light or the dark one for good.
 * The choice is stored as a preference on the device. The Profile menu and the Display settings both show it.
 */
export function ThemeChoiceControl({ size = "sm" }: { size?: "sm" | "md" }) {
  const dispatch = useAppDispatch();
  const choice = useAppSelector(selectThemeChoice);
  return (
    <SegmentedControl
      label="Theme"
      size={size}
      options={themeChoices.map((value) => ({
        value,
        label: choiceLabels[value],
      }))}
      value={choice}
      onChange={(value) => dispatch(actions.preferenceSet("theme", value))}
    />
  );
}
