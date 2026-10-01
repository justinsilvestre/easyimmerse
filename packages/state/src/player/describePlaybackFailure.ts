/** Explains that the media element could not play the file, with the code and message of its `MediaError`. */
export function describePlaybackFailure(
  fileName: string,
  code: number,
  message: string,
): string {
  const codeName = mediaErrorCodeNames[code] ?? `error code ${code}`;
  const detail = message === "" ? codeName : `${codeName}: ${message}`;
  return `Could not play ${fileName}. Its format may not be supported here. (${detail})`;
}

const mediaErrorCodeNames: Record<number, string> = {
  1: "MEDIA_ERR_ABORTED",
  2: "MEDIA_ERR_NETWORK",
  3: "MEDIA_ERR_DECODE",
  4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
};
