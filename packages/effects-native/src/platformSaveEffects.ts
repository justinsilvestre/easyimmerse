import type { NativePlatform } from "@easyimmerse/backend";
import type { Effects } from "@easyimmerse/state";
import { pickSavePath } from "./pickSavePath.ts";
import { pickStagingPath, saveStagedCopy } from "./stagingSaveEffects.ts";

/**
 * Builds how the platform saves files.
 * A desktop asks for a path in its save dialog. A phone's save dialog names no path the server can write to,
 * so the server writes the file inside the app, and the user then chooses where to keep a copy.
 */
export function createPlatformSaveEffects(
  platform: NativePlatform,
): Pick<Effects, "pickSavePath" | "saveCopy"> {
  return platform === "mobile"
    ? { pickSavePath: pickStagingPath, saveCopy: saveStagedCopy }
    : { pickSavePath, saveCopy: refuseCopy };
}

async function refuseCopy(): Promise<never> {
  throw new Error("Only the mobile app keeps a copy of a staged file.");
}
