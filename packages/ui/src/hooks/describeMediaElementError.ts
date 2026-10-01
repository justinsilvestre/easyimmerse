const messagesByCode: Record<number, string> = {
  2: "The media file could not be read.",
  3: "This player could not decode the media file.",
  4: "This player does not support the file's format.",
};

/** Returns a message for the user about a media element's error, chosen by its code, such as `MediaError.MEDIA_ERR_DECODE`. */
export function describeMediaElementError(code: number | undefined): string {
  return (
    (code !== undefined && messagesByCode[code]) ||
    "Playback stopped unexpectedly."
  );
}
