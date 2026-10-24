import type { NativePlatform } from "@easyimmerse/state";

/** How the copy names the device the native app runs on. */
export const deviceNames = {
  desktop: "this computer",
  mobile: "this device",
} satisfies Record<NativePlatform, string>;
