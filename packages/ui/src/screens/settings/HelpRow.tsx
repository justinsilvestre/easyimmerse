import { actions } from "@easyimmerse/state";
import { CircleQuestionMark } from "lucide-react";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { SettingsPageButton } from "./SettingsPageButton.tsx";

export const helpUrl = "https://github.com/justinsilvestre/easyimmerse";

/** The Help row of Settings, which opens the project's page outside the app. */
export function HelpRow() {
  const dispatch = useAppDispatch();
  return (
    <SettingsPageButton
      icon={<CircleQuestionMark className="size-4 text-fg-muted" aria-hidden />}
      label="Help"
      description="Opens the easyImmerse project page in your browser."
      isExternal
      onClick={() => dispatch(actions.externalLinkRequested(helpUrl))}
    />
  );
}
