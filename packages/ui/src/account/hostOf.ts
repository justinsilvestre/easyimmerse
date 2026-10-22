/** Returns the host of a server's address, as the person would recognize it, or the address itself when it is not a URL. */
export function hostOf(serverUrl: string): string {
  try {
    return new URL(serverUrl).host;
  } catch {
    return serverUrl;
  }
}
