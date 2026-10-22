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
 * The footer bar as every screen shows it, with whether the user's work is backed up, the activities under way elsewhere in the app,
 * and the screen's own buttons, passed as children, at its right edge.
 * While Settings is open, its control stands for the page already open and does nothing; so does the local network sync control on its own page.
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
