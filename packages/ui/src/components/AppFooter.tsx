import {
  actions,
  selectFooterActivities,
  selectIsSettingsOpen,
} from "@easyimmerse/state";
import type { ReactNode } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { FooterBar } from "./FooterBar.tsx";

/**
 * The footer bar as every screen shows it, with the activities under way elsewhere in the app,
 * and the screen's own buttons, passed as children, at its right edge.
 * While Settings is open, its control stands for the page already open and does nothing.
 */
export function AppFooter({ children }: { children?: ReactNode }) {
  const dispatch = useAppDispatch();
  const isSettingsOpen = useAppSelector(selectIsSettingsOpen);
  const activities = useAppSelector(selectFooterActivities);
  return (
    <FooterBar
      isSettingsOpen={isSettingsOpen}
      onOpenSettings={() =>
        dispatch(actions.navigated({ type: "openSettings" }))
      }
      activities={activities}
      onOpenActivity={(activity) =>
        dispatch(actions.navigated(activity.opens.step))
      }
    >
      {children}
    </FooterBar>
  );
}
