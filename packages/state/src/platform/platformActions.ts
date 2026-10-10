/** The action creators that ask the platform for something without changing any state. */
export const platformActions = {
  externalLinkRequested: (url: string) =>
    ({ type: "externalLinkRequested", url }) as const,
};

/** An action that asks the platform for something. */
export type PlatformAction = ReturnType<
  (typeof platformActions)[keyof typeof platformActions]
>;
