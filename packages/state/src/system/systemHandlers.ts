import type { UpdateHandlers } from "../updateHandlers.ts";

export const systemHandlers = {
  notificationRequested: (state, { message }) => [
    state,
    [{ type: "showNotification", message }],
  ],
  cueCopyRequested: (state, { text }) => [
    state,
    [
      { type: "copyToClipboard", text },
      { type: "showNotification", message: "Copied to clipboard" },
    ],
  ],
  externalLinkRequested: (state, { url }) => [
    state,
    [{ type: "openExternalUrl", url }],
  ],
  storedFileReadFailed: (state, { message }) => [
    state,
    [
      {
        type: "showNotification",
        message: `Could not read a file stored in this browser: ${message}`,
      },
    ],
  ],
} satisfies Partial<UpdateHandlers>;
