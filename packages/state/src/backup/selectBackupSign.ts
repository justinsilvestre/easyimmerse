import type { SyncLink } from "@easyimmerse/types";
import type { RootState } from "../app/createAppStore.ts";
import { selectFailedSaves } from "../flashcards/failedSave.ts";
import { selectRecoverableWork } from "../recovery/recoverableWork.ts";
import { cacheEntry } from "../server/cacheEntry.ts";
import {
  selectBundledServerPlatform,
  selectWorkHome,
} from "../server/serverSelectors.ts";
import type { NativePlatform } from "../server/serverState.ts";
import { selectSyncStatus } from "../sync/syncSelectors.ts";

/** What the footer's sign tells about whether the person's work is backed up. */
export type BackupSign =
  | { kind: "hidden" }
  /** Flashcards wait to be saved while the app runs without a server, so they are kept only in this browser. */
  | { kind: "browserOnly" }
  /** Flashcards the server failed to save are kept only in this browser until they are saved. */
  | { kind: "failedSaves" }
  /** Some project is kept only on the native app's built-in server. */
  | {
      kind: "deviceOnly";
      platform: NativePlatform;
      hasOfficialServer: boolean;
    }
  /**
   * Some project is not yet copied to the remote the built-in server is linked to, because syncing with it fails:
   * the remote could not be reached since `sinceMs`, or a round failed for another reason, when `sinceMs` is null.
   */
  | {
      kind: "linkFailing";
      platform: NativePlatform;
      serverUrl: string;
      sinceMs: number | null;
    }
  /** Some project is not yet copied to the remote the built-in server is linked to, because the remote logged out the account with this email address. */
  | {
      kind: "loggedOut";
      platform: NativePlatform;
      serverUrl: string;
      email: string;
    };

const hidden: BackupSign = { kind: "hidden" };

/** Returns what the footer's sign tells about whether the person's work is backed up. */
export function selectBackupSign(root: RootState): BackupSign {
  switch (selectWorkHome(root)) {
    case "browser":
      return browserSign(root);
    case "accountServer":
      return accountServerSign(root);
    case "builtInServer":
      return builtInServerSign(root);
  }
}

function browserSign({ app }: RootState): BackupSign {
  return selectRecoverableWork(app).saves.length > 0
    ? { kind: "browserOnly" }
    : hidden;
}

function accountServerSign({ app }: RootState): BackupSign {
  return selectFailedSaves(app).length > 0 ? { kind: "failedSaves" } : hidden;
}

/**
 * While a link to a remote works, it copies every change within seconds, so a project that is briefly not backed up shows no sign.
 * Until the built-in server has reported its status, the sign stays hidden rather than guess whether a link exists.
 */
function builtInServerSign(root: RootState): BackupSign {
  if (selectFailedSaves(root.app).length > 0) return { kind: "failedSaves" };
  const status = selectSyncStatus(root);
  if (status === null || !hasProjectNotBackedUp(root)) return hidden;
  if (status.link === null) return deviceOnlySign(root);
  return linkSign(status.link, platformOf(root));
}

function linkSign(link: SyncLink, platform: NativePlatform): BackupSign {
  const { server_url: serverUrl, state } = link;
  switch (state.kind) {
    case "logged_out":
      return {
        kind: "loggedOut",
        platform,
        serverUrl,
        email: link.account_email,
      };
    case "unreachable":
      return {
        kind: "linkFailing",
        platform,
        serverUrl,
        sinceMs: state.since_ms,
      };
    case "failed":
      return { kind: "linkFailing", platform, serverUrl, sinceMs: null };
    case "idle":
    case "syncing":
      return hidden;
  }
}

function hasProjectNotBackedUp({ backend }: RootState): boolean {
  const projects = cacheEntry(backend, "listProjects", undefined)?.data
    ?.projects;
  return projects?.some((project) => !project.is_backed_up) ?? false;
}

function deviceOnlySign(root: RootState): BackupSign {
  return {
    kind: "deviceOnly",
    platform: platformOf(root),
    hasOfficialServer: root.app.server.cloudUrl !== null,
  };
}

function platformOf(root: RootState): NativePlatform {
  return selectBundledServerPlatform(root) ?? "desktop";
}
