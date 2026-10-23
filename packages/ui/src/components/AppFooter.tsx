import { actions, selectFooterActivities } from "@easyimmerse/state";
import type { ReactNode } from "react";
import { SyncMenu } from "../account/SyncMenu.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { FooterBar } from "./FooterBar.tsx";

/**
 * Shows the footer bar of every screen: the Sync menu, which tells where the user's work is kept, the activities under way elsewhere in the app,
 * and the screen's own buttons, passed as children, at its right edge.
 */
export function AppFooter({ children }: { children?: ReactNode }) {
  const dispatch = useAppDispatch();
  const activities = useAppSelector(selectFooterActivities);
  return (
    <FooterBar
      syncMenu={<SyncMenu />}
      activities={activities}
      onOpenActivity={({ opens }) => {
        if (opens) dispatch(actions.navigated(opens.step));
      }}
    >
      {children}
    </FooterBar>
  );
}
