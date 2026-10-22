import type { RootState } from "../app/createAppStore.ts";
import { selectFailedSaves } from "../flashcards/failedSave.ts";
import { selectRecoverableWork } from "../recovery/recoverableWork.ts";
import { cacheEntry } from "../server/cacheEntry.ts";
import {
  selectBundledServerPlatform,
  selectWorkHome,
} from "../server/serverSelectors.ts";
import type { NativePlatform } from "../server/serverState.ts";

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

function builtInServerSign(root: RootState): BackupSign {
  if (selectFailedSaves(root.app).length > 0) return { kind: "failedSaves" };
  return hasProjectNotBackedUp(root) ? deviceOnlySign(root) : hidden;
}

function hasProjectNotBackedUp({ backend }: RootState): boolean {
  const projects = cacheEntry(backend, "listProjects", undefined)?.data
    ?.projects;
  return projects?.some((project) => !project.is_backed_up) ?? false;
}

function deviceOnlySign(root: RootState): BackupSign {
  return {
    kind: "deviceOnly",
    platform: selectBundledServerPlatform(root) ?? "desktop",
    hasOfficialServer: root.app.server.cloudUrl !== null,
  };
}
