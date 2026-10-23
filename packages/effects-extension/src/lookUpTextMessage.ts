import type { LookupQuery } from "@easyimmerse/types";

/** The message a content script sends the background script to look up a text on the page. */
export type LookUpTextMessage = { kind: "lookUpText"; query: LookupQuery };

export function isLookUpTextMessage(
  value: unknown,
): value is LookUpTextMessage {
  if (typeof value !== "object" || value === null) return false;
  const { kind, query } = value as Partial<LookUpTextMessage>;
  return kind === "lookUpText" && typeof query === "object" && query !== null;
}
