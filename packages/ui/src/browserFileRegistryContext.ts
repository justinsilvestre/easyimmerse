import type { BrowserFileRegistry } from "@easyimmerse/state";
import { createContext, useContext } from "react";

/**
 * The registry holding the files a browser picked, provided by the web app and the extension.
 * Null on platforms where media files always live on disk, such as the desktop app.
 */
export const BrowserFileRegistryContext =
  createContext<BrowserFileRegistry<File> | null>(null);

export function useBrowserFileRegistry(): BrowserFileRegistry<File> | null {
  return useContext(BrowserFileRegistryContext);
}
