import type { WebEngine } from "@easyimmerse/types";

/**
 * Identifies the browser engine from a user agent string.
 * An unrecognized engine counts as WebKit, whose playback support is the most limited, so the server plans conservatively.
 */
export function detectWebEngine(userAgent: string): WebEngine {
  if (/\bFirefox\//.test(userAgent)) return "gecko";
  if (/\b(Chrome|Chromium)\//.test(userAgent)) return "chromium";
  return "webkit";
}
