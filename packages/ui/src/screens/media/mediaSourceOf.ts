import type { InstalledPlugin, MediaOrigin } from "@easyimmerse/types";

/**
 * The plugin a media file was imported through, as its chip shows it: by the plugin's title,
 * or by its name and unavailable when it is no longer installed.
 * Null for a file that no plugin imported, and while the installed plugins are not known yet.
 */
export function mediaSourceOf(
  origin: MediaOrigin | null,
  plugins: readonly InstalledPlugin[] | undefined,
): { title: string; isAvailable: boolean } | null {
  if (origin === null || plugins === undefined) return null;
  const plugin = plugins.find(({ name }) => name === origin.plugin);
  return plugin
    ? { title: plugin.title, isAvailable: true }
    : { title: origin.plugin, isAvailable: false };
}
