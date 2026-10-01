import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

const title = "easyImmerse";

/** Shows an operating system notification. Resolves false when the user denies permission. */
export async function sendOsNotification(message: string): Promise<boolean> {
  if (!(await ensurePermission())) return false;
  sendNotification({ title, body: message });
  return true;
}

async function ensurePermission(): Promise<boolean> {
  if (await isPermissionGranted()) return true;
  return (await requestPermission()) === "granted";
}
