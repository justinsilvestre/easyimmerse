/** Each pattern a user agent may match, tried in order, with the browser it names. */
const browsers: readonly (readonly [RegExp, string])[] = [
  [/\bEdg(e|A|iOS)?\//, "Edge"],
  [/\bOPR\//, "Opera"],
  [/\b(Firefox|FxiOS)\//, "Firefox"],
  [/\b(Chrome|CriOS)\//, "Chrome"],
  [/\bVersion\/[\d.]+.*\bSafari\//, "Safari"],
];

/** Each pattern a user agent may match, tried in order, with the operating system or device it names. */
const systems: readonly (readonly [RegExp, string])[] = [
  [/\biPhone\b/, "iPhone"],
  [/\biPad\b/, "iPad"],
  [/\bAndroid\b/, "Android"],
  [/\bWindows\b/, "Windows"],
  [/\bCrOS\b/, "ChromeOS"],
  [/\b(Macintosh|Mac OS X)\b/, "macOS"],
  [/\bLinux\b/, "Linux"],
];

/**
 * Names the device a session was opened on from the User-Agent header it sent, such as "Firefox on Linux",
 * or "Unknown device" when the header is empty or unrecognized.
 */
export function describeDevice(userAgent: string): string {
  if (/\b(Tauri|easyImmerse)\b/i.test(userAgent))
    return "easyImmerse desktop app";
  const browser = firstMatch(browsers, userAgent);
  const system = firstMatch(systems, userAgent);
  if (browser !== null && system !== null) return `${browser} on ${system}`;
  return browser ?? system ?? "Unknown device";
}

function firstMatch(
  patterns: readonly (readonly [RegExp, string])[],
  text: string,
): string | null {
  return patterns.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}
