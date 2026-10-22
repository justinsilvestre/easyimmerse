/**
 * Explains in a sentence why a round of backing up to a server failed, given the failure's code,
 * the server's host name, and how the copy names the device.
 */
export function syncFailureReason(
  code: string,
  host: string,
  device: string,
): string {
  switch (code) {
    case "remote_protocol":
    case "unknown_sync_table":
      return `${host} answered in a way this version of easyImmerse doesn't understand. Updating the app or the server may fix this.`;
    case "internal":
      return `${host} ran into a problem of its own. Trying again later may help.`;
    case "storage":
      return `easyImmerse couldn't read its own data on ${device}.`;
    case "local_file":
      return `A media file on ${device} couldn't be read.`;
    default:
      return `${host} refused the backup.`;
  }
}
