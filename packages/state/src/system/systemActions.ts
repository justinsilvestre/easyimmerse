/** Actions that reach the operating system: notifications, the clipboard, and the browser. */
export const systemActions = {
  notificationRequested: (message: string) =>
    ({ type: "notificationRequested", message }) as const,
  cueCopyRequested: (text: string) =>
    ({ type: "cueCopyRequested", text }) as const,
  externalLinkRequested: (url: string) =>
    ({ type: "externalLinkRequested", url }) as const,
  storedFileReadFailed: (message: string) =>
    ({ type: "storedFileReadFailed", message }) as const,
};
