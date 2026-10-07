import { Settings } from "lucide-react";
import {
  useIsSettingsOpen,
  useNavigationActions,
} from "../navigationContext.ts";
import { IconButton } from "./IconButton.tsx";
import { ThemeMenu } from "./ThemeMenu.tsx";

/**
 * A thin bar at the bottom of the window, with the way to Settings and the theme menu at its right edge.
 * It looks the same on every screen.
 * While Settings is open, its control stands for the page already open and does nothing.
 */
export function AppFooter() {
  const { openSettings } = useNavigationActions();
  const isSettingsOpen = useIsSettingsOpen();
  return (
    <footer className="sticky bottom-0 border-t border-line bg-surface">
      <div className="flex items-center justify-end gap-2 px-2 py-0.5">
        <IconButton
          label="Settings"
          aria-current={isSettingsOpen ? "page" : undefined}
          aria-disabled={isSettingsOpen || undefined}
          onClick={isSettingsOpen ? undefined : openSettings}
        >
          <Settings className="size-4" />
        </IconButton>
        <ThemeMenu />
      </div>
    </footer>
  );
}
