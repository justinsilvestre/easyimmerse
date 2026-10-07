import {
  actions,
  selectThemeChoice,
  type ThemeChoice,
  themeChoices,
} from "@easyimmerse/state";
import { Moon, Sun, SunMoon } from "lucide-react";
import type { ReactNode } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { MenuButton } from "./MenuButton.tsx";

const choiceLabels: Record<ThemeChoice, string> = {
  system: "Follow the system",
  light: "Light",
  dark: "Dark",
};

const choiceIcons: Record<ThemeChoice, ReactNode> = {
  system: <SunMoon className="size-4" />,
  light: <Sun className="size-4" />,
  dark: <Moon className="size-4" />,
};

/**
 * An icon showing the theme choice in force, which opens a menu to follow the system, or to use the light or the dark theme for good.
 * The menu opens upward and to the right, as the button sits at the left end of the app footer.
 */
export function ThemeMenu() {
  const dispatch = useAppDispatch();
  const choice = useAppSelector(selectThemeChoice);
  return (
    <MenuButton
      label={`Theme: ${choiceLabels[choice]}`}
      icon={choiceIcons[choice]}
      opensUpward
      align="start"
      items={themeChoices.map((option) => ({
        label: choiceLabels[option],
        icon: choiceIcons[option],
        isChecked: option === choice,
        closesOnSelect: true,
        onSelect: () => dispatch(actions.preferenceSet("theme", option)),
      }))}
    />
  );
}
