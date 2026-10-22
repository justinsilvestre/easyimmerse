import { playbackPositionKey } from "../storedPlaces/playbackPosition.ts";
import { readingLocationKey } from "../storedPlaces/readingLocation.ts";
import type { PreferenceKey } from "./preferencesState.ts";

/** The preferences, named in full, that follow a person to every device rather than staying with the device that set them. */
export const personBoundPreferenceKeys = [
  "showTranslations",
  "showReviewIntervals",
] as const satisfies readonly PreferenceKey[];

/** The prefixes of the stored places, each followed by a media file id, which follow a person to every device. */
const personBoundPrefixes = [readingLocationKey(""), playbackPositionKey("")];

/**
 * Whether a preference follows the person to every device, rather than staying with the device that set it.
 * The server classifies the keys it syncs the same way.
 */
export function isPersonBoundPreferenceKey(key: string): boolean {
  return (
    (personBoundPreferenceKeys as readonly string[]).includes(key) ||
    personBoundPrefixes.some((prefix) => key.startsWith(prefix))
  );
}
