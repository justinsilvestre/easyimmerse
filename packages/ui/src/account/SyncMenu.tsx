import {
  isBackupFault,
  type SyncPlace,
  selectBackupSign,
  selectSyncPlace,
} from "@easyimmerse/state";
import clsx from "clsx";
import { Cloud, Laptop, Monitor, Smartphone } from "lucide-react";
import { shallowEqual } from "react-redux";
import { IconButton } from "../components/IconButton.tsx";
import { MenuShell } from "../components/MenuShell.tsx";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { SyncMenuPanel } from "./SyncMenuPanel.tsx";
import { syncStatusLine } from "./syncStatusLine.ts";
import { useSyncQueries } from "./useSyncQueries.ts";

/**
 * The Sync button in the footer, whose icon tells where the person's work is kept: on this device, on a server, or on a paired desktop app.
 * The icon takes the warning colour while the work cannot be backed up, and the button is named by its status line.
 * It opens a popover that tells where the work is, what is wrong and how to fix it, and the ways of keeping the work elsewhere.
 * With `isInitiallyOpen`, the popover starts open.
 */
export function SyncMenu({
  isInitiallyOpen = false,
}: {
  isInitiallyOpen?: boolean;
}) {
  useSyncQueries();
  const place = useAppSelector(selectSyncPlace, shallowEqual);
  const sign = useAppSelector(selectBackupSign, shallowEqual);
  const status = syncStatusLine(place, sign);
  return (
    // On a narrow screen the popover is placed against the footer rather than the button, which may sit too far right for it to fit.
    <MenuShell
      popup="dialog"
      className="shrink-0 max-sm:static"
      isInitiallyOpen={isInitiallyOpen}
      trigger={(triggerProps) => (
        <IconButton label={status} {...triggerProps}>
          <SyncPlaceIcon place={place} isFault={isBackupFault(sign)} />
        </IconButton>
      )}
      menu={(popupProps) => (
        <SyncMenuPanel
          {...popupProps}
          status={status}
          place={place}
          sign={sign}
        />
      )}
    />
  );
}

const placeIcons = {
  thisDevice: { browser: Smartphone, computer: Monitor, mobile: Smartphone },
  server: Cloud,
  pairedDesktop: Laptop,
};

function SyncPlaceIcon({
  place,
  isFault,
}: {
  place: SyncPlace;
  isFault: boolean;
}) {
  const Icon =
    place.kind === "thisDevice"
      ? placeIcons.thisDevice[place.device]
      : placeIcons[place.kind];
  return (
    <Icon
      aria-hidden
      className={clsx("size-4", isFault && "text-warning-fg")}
    />
  );
}
