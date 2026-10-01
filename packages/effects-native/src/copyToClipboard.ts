import { writeText } from "@tauri-apps/plugin-clipboard-manager";

export function copyToClipboard(text: string): Promise<void> {
  return writeText(text);
}
