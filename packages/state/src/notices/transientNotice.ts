import type { NoticeContent, NoticeTone } from "./noticesState.ts";

/** Returns a notice without buttons that goes by itself after ten seconds. */
export function transientNotice(
  tone: NoticeTone,
  message: string,
): NoticeContent {
  return { tone, message, buttons: [], isTransient: true };
}
