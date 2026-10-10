/** The action creators that ask the platform for something, and those that report its answer. */
export const platformActions = {
  externalLinkRequested: (url: string) =>
    ({ type: "externalLinkRequested", url }) as const,
  /** Asks the platform to copy the text; `what` names it in the notice that follows, such as "log". */
  textCopyRequested: (text: string, what: string) =>
    ({ type: "textCopyRequested", text, what }) as const,
  /** The platform copied the text named `what`. */
  textCopied: (what: string) => ({ type: "textCopied", what }) as const,
  /** The platform refused to copy the text named `what`. */
  textCopyFailed: (what: string) => ({ type: "textCopyFailed", what }) as const,
};

/** An action that asks the platform for something or brings back its answer. */
export type PlatformAction = ReturnType<
  (typeof platformActions)[keyof typeof platformActions]
>;
