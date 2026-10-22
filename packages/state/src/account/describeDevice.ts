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

/** The operating systems a native app's built-in server names in its user agent, with the kind of app and the name to show. */
const builtInServerSystems: Readonly<
  Record<string, readonly [string, string]>
> = {
  macos: ["desktop", "macOS"],
  windows: ["desktop", "Windows"],
  linux: ["desktop", "Linux"],
  ios: ["mobile", "iOS"],
  android: ["mobile", "Android"],
};

/**
 * Names the device a session was opened on from the User-Agent header it sent, such as "Firefox on Linux",
 * or "Unknown device" when the header is empty or unrecognized.
 */
export function describeDevice(userAgent: string): string {
  const builtInServerSystem = /^easyImmerse\/\S*\s*\((\w+)\)/.exec(
    userAgent,
  )?.[1];
  if (builtInServerSystem !== undefined)
    return describeBuiltInServer(builtInServerSystem);
  if (/\b(Tauri|easyImmerse)\b/i.test(userAgent))
    return "easyImmerse desktop app";
  const browser = firstMatch(browsers, userAgent);
  const system = firstMatch(systems, userAgent);
  if (browser !== null && system !== null) return `${browser} on ${system}`;
  return browser ?? system ?? "Unknown device";
}

/** Names a native app whose built-in server opened the session, given the operating system its user agent names. */
function describeBuiltInServer(system: string): string {
  const known = builtInServerSystems[system.toLowerCase()];
  if (known === undefined) return "easyImmerse app";
  const [kind, systemName] = known;
  return `easyImmerse ${kind} app (${systemName})`;
}

function firstMatch(
  patterns: readonly (readonly [RegExp, string])[],
  text: string,
): string | null {
  return patterns.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}
