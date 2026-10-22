import type { ConversionCapabilities } from "@easyimmerse/types";

/**
 * Tells whether the desktop app tells the person that no video encoder works: the bundled ffmpeg build looked for one and found none,
 * and the person has not put the notice aside. It waits until the stored preferences are read.
 */
export function isEncoderNoticeDue({
  capabilities,
  isDismissed,
  arePreferencesLoaded,
}: {
  capabilities: ConversionCapabilities | undefined;
  isDismissed: boolean;
  arePreferencesLoaded: boolean;
}): boolean {
  return (
    arePreferencesLoaded &&
    !isDismissed &&
    capabilities !== undefined &&
    capabilities.ffmpeg !== null &&
    !capabilities.ffmpeg.is_custom &&
    capabilities.encoder_discovery_finished &&
    capabilities.video_encoder === null
  );
}
