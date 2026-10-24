import { actions, selectFooterActivities } from "@easyimmerse/state";
import type { ReactNode } from "react";
import { useAppDispatch } from "../useAppDispatch.ts";
import { useAppSelector } from "../useAppSelector.ts";
import { FooterBar } from "./FooterBar.tsx";
import { SyncMenu } from "./SyncMenu.tsx";

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
