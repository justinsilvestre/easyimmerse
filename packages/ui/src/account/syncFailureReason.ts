/**
 * Explains why a round of backing up to a server failed, given the failure's code,
 * how the copy names the server and how it names the device.
 * Only the people who run a server of their own can update it, so the easyImmerse cloud is never suggested for updating.
 */
export function syncFailureReason(
  code: string,
  host: string,
  device: string,
  isCloudServer: boolean,
): string {
  switch (code) {
    case "remote_protocol":
    case "unknown_sync_table":
      return `This version of the app doesn't work with ${host}. ${isCloudServer ? "Updating the app" : "Updating the app or the server"} may fix this.`;
    case "internal":
      return `Something went wrong on ${host}. Trying again later may help.`;
    case "storage":
      return `easyImmerse couldn't read its own data on ${device}.`;
    case "local_file":
      return `A media file on ${device} couldn't be read.`;
    default:
      return `The backup was refused by ${host}.`;
  }
}
