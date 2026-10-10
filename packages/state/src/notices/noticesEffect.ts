import type { NoticeContent } from "./noticesState.ts";

/** Asks for a notice from a feature other than the notices. */
export type NoticesEffect = { type: "showNotice"; content: NoticeContent };
