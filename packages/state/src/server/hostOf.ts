/**
 * Returns the host of a server's address, as the person would recognize it: the address without its scheme and path.
 * An address that is not a URL is returned as it is.
 */
export function hostOf(serverUrl: string): string {
  const match = /^[a-z][a-z\d+.-]*:\/\/([^/?#]+)/i.exec(serverUrl);
  return match?.[1] ?? serverUrl;
}
