import type { LookupResponse } from "@easyimmerse/types";
import type { LookupState } from "./lookupState.ts";

/** Where the lookup request for a term stands. */
export type LookupOutcome =
  | { kind: "pending" }
  | { kind: "failed" }
  | { kind: "answered"; response: LookupResponse };

/** Describes what the dictionary pop-up shows for a term, given where its lookup stands. */
export function lookupStateOf(
  term: string,
  outcome: LookupOutcome,
): LookupState {
  switch (outcome.kind) {
    case "pending":
      return { kind: "loading", term };
    case "failed":
      return { kind: "failed", term };
    case "answered": {
      const { results, kanji, stylesheets } = outcome.response;
      return results.length === 0 && kanji.length === 0
        ? { kind: "notFound", term }
        : { kind: "found", term, results, kanji, stylesheets };
    }
  }
}
