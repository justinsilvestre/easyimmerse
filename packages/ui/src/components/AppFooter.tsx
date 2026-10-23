import {
  actions,
  selectFooterActivities,
  selectIsSettingsOpen,
} from "@easyimmerse/state";
import type { ReactNode } from "react";
import { CloudMenu } from "../account/CloudMenu.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { FooterBar } from "./FooterBar.tsx";

/**
 * Shows the footer bar of every screen: the cloud menu, which tells whether the user's work is backed up, the activities under way elsewhere in the app,
 * and the screen's own buttons, passed as children, at its right edge.
 * The Settings button does nothing while Settings is open.
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
      cloudMenu={<CloudMenu />}
      activities={activities}
      onOpenActivity={({ opens }) => {
        if (opens) dispatch(actions.navigated(opens.step));
      }}
    >
      {children}
    </FooterBar>
  );
}
