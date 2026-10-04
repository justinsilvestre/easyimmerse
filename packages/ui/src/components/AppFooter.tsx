import clsx from "clsx";
import { useNavigationActions } from "../navigationContext.ts";
import { Button } from "./Button.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";

/**
 * Shows the Settings link and the theme switch at the bottom of a screen.
 * `contentClassName` lets it line up with the screen's content.
 */
export function AppFooter({
  contentClassName,
  showSettingsLink = true,
}: {
  contentClassName?: string;
  showSettingsLink?: boolean;
}) {
  const { openSettings } = useNavigationActions();
  return (
    <footer className="border-t border-line">
      <div
        className={clsx(
          "flex items-center justify-end gap-4 px-4 py-3",
          contentClassName,
        )}
      >
        {showSettingsLink && (
          <Button variant="subtle" onClick={openSettings}>
            Settings
          </Button>
        )}
        <ThemeToggle />
      </div>
    </footer>
  );
}
