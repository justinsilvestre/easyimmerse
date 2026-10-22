import {
  actions,
  selectFooterActivities,
  selectIsPairingOpen,
  selectIsSettingsOpen,
} from "@easyimmerse/state";
import type { ReactNode } from "react";
import { NotBackedUpSign } from "../account/NotBackedUpSign.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { FooterBar } from "./FooterBar.tsx";

/**
 * Shows the footer bar of every screen: whether the user's work is backed up, the activities under way elsewhere in the app,
 * and the screen's own buttons, passed as children, at its right edge.
 * The Settings button does nothing while Settings is open, and the Local network sync button does nothing while its page is open.
 */
export function AppFooter({ children }: { children?: ReactNode }) {
  const dispatch = useAppDispatch();
  const isSettingsOpen = useAppSelector(selectIsSettingsOpen);
  const isPairingOpen = useAppSelector(selectIsPairingOpen);
  const activities = useAppSelector(selectFooterActivities);
  return (
    <FooterBar
      isSettingsOpen={isSettingsOpen}
      onOpenSettings={() =>
        dispatch(actions.navigated({ type: "openSettings" }))
      }
      isPairingOpen={isPairingOpen}
      onOpenPairing={() => dispatch(actions.navigated({ type: "openPairing" }))}
      backupSign={<NotBackedUpSign />}
      activities={activities}
      onOpenActivity={({ opens }) => {
        if (opens) dispatch(actions.navigated(opens.step));
      }}
    >
      {children}
    </FooterBar>
  );
}
