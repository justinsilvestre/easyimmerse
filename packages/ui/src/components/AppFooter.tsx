import { actions, selectIsSettingsOpen } from "@easyimmerse/state";
import { Settings } from "lucide-react";
import type { ReactNode } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { IconButton } from "./IconButton.tsx";
import { ThemeMenu } from "./ThemeMenu.tsx";

/**
 * A thin bar at the bottom of the window, with the way to Settings and the theme menu at its left edge,
 * which look the same on every screen, and the screen's own buttons, passed as children, at its right edge.
 * While Settings is open, its control stands for the page already open and does nothing.
 */
export function AppFooter({ children }: { children?: ReactNode }) {
  const dispatch = useAppDispatch();
  const isSettingsOpen = useAppSelector(selectIsSettingsOpen);
  const openSettings = () =>
    dispatch(actions.navigated({ type: "openSettings" }));
  return (
    <footer className="sticky bottom-0 border-t border-line bg-surface">
      <div className="flex items-center justify-between gap-2 px-2 py-0.5">
        <div className="flex items-center gap-2">
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
        {children && <div className="flex items-center gap-1">{children}</div>}
      </div>
    </footer>
  );
}
