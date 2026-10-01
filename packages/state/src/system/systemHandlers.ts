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
} satisfies Partial<UpdateHandlers>;
