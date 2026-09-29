import type { Platform } from "@easyimmerse/client/state/AppState";

const mobileOperatingSystems = ["android", "ios"];

/**
 * Tells whether the app was built for desktop or mobile devices.
 *
 * @param operatingSystem The name given by Tauri to the operating system that the app was built for.
 */
export function readPlatform(operatingSystem: string): Platform {
  return mobileOperatingSystems.includes(operatingSystem)
    ? "mobile"
    : "desktop";
}
