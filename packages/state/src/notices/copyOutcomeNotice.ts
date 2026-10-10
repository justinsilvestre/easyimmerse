import type { PlatformAction } from "../platform/platformActions.ts";
import type { NoticeContent } from "./noticesState.ts";
import { transientNotice } from "./transientNotice.ts";

type CopyOutcome = Extract<
  PlatformAction,
  { type: "textCopied" } | { type: "textCopyFailed" }
>;

/** Returns the transient notice that tells the user whether the platform copied the text. */
export function copyOutcomeNotice(outcome: CopyOutcome): NoticeContent {
  return outcome.type === "textCopied"
    ? transientNotice("success", `Copied the ${outcome.what}.`)
    : transientNotice("danger", `The ${outcome.what} could not be copied.`);
}
