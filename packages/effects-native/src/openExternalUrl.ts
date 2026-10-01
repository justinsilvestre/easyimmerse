import { openUrl } from "@tauri-apps/plugin-opener";

/** Opens the URL in the system browser. Only `https://` URLs pass the capability's allow-list. */
export function openExternalUrl(url: string): void {
  void openUrl(url);
}
