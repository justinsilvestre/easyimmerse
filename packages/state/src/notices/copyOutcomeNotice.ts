import type { PlatformAction } from "../platform/platformActions.ts";
import type { NoticeContent } from "./noticesState.ts";
import { transientNotice } from "./transientNotice.ts";

type CopyOutcome = Extract<
  PlatformAction,
  { type: "textCopied" } | { type: "textCopyFailed" }
>;

/**
 * Returns the transient notice that tells the user whether the platform copied the text.
 * Its key replaces the notice of an earlier copy of the same thing.
 */
export function copyOutcomeNotice(outcome: CopyOutcome): NoticeContent {
  const key = `copy:${outcome.what}`;
  return outcome.type === "textCopied"
    ? { ...transientNotice("success", `Copied the ${outcome.what}.`), key }
    : {
        ...transientNotice(
          "danger",
          `The ${outcome.what} could not be copied.`,
        ),
        key,
      };
}
