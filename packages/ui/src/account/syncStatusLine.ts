import type { BackupFault, BackupSign, SyncPlace } from "@easyimmerse/state";
import { isBackupFault } from "@easyimmerse/state";
import { formatTimeAgo } from "./formatTimeAgo.ts";

const deviceWhere = {
  browser: "in this browser",
  computer: "on this computer",
  mobile: "on this device",
} satisfies Record<
  Extract<SyncPlace, { kind: "thisDevice" }>["device"],
  string
>;

/** Tells in one line where the person's work is kept, or what keeps it from being backed up. `now` dates the last backup. */
export function syncStatusLine(
  place: SyncPlace,
  sign: BackupSign,
  now: number = Date.now(),
): string {
  if (isBackupFault(sign)) return faultLine(sign);
  switch (place.kind) {
    case "thisDevice":
      return `Saved only ${deviceWhere[place.device]}`;
    case "server": {
      const backedUp = `Backed up to ${place.serverName}`;
      return place.lastBackedUpMs === null
        ? backedUp
        : `${backedUp} ${formatTimeAgo(place.lastBackedUpMs, now)}`;
    }
    case "pairedDesktop":
      return place.deviceName === null
        ? `Paired with the desktop app at ${place.host}`
        : `Paired with ${place.deviceName}`;
  }
}

function faultLine(fault: BackupFault): string {
  switch (fault.kind) {
    case "failedSaves":
      return "Some flashcards haven't been saved yet";
    case "linkUnreachable":
      return `Couldn't reach ${fault.serverName}`;
    case "linkFailed":
      return `Couldn't back up to ${fault.serverName}`;
    case "loggedOut":
      return `Logged out of ${fault.serverName}`;
  }
}
