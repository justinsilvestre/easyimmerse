export const platformActions = {
  notificationRequested: (message: string) =>
    ({ type: "notificationRequested", message }) as const,
  externalLinkRequested: (url: string) =>
    ({ type: "externalLinkRequested", url }) as const,
};

export type PlatformAction = ReturnType<
  (typeof platformActions)[keyof typeof platformActions]
>;
