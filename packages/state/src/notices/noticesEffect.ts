import type { NoticeContent } from "./noticesState.ts";

/** Asks, from a feature other than the notices, for a notice to be shown, or for the shown notice of a key to be withdrawn. */
export type NoticesEffect =
  | { type: "showNotice"; content: NoticeContent }
  | { type: "withdrawNotice"; key: string };
