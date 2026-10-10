import type { LookupQuery } from "@easyimmerse/types";
import type { Effect } from "../../app/effect.ts";

/** The ids of the lookup's timers. Starting one again replaces it. */
export const lookupTimerIds = {
  close: "lookup/close",
  flashcardWait: "lookup/flashcardWait",
};

/** Cancels the lookup's timers as its screen closes. A flashcard's request in flight is left to settle, unheeded. */
export const leaveLookup = Object.values(lookupTimerIds).map(
  (id) => ({ type: "cancelTimer", id }) satisfies Effect,
);

const hoverRequestPrefix = "lookup/hover";

/** The id of the lookup request of the flashcard with this id, which the dispatcher made unique. */
export function lookupRequestId(flashcardId: string): string {
  return `lookup/flashcard/${flashcardId}`;
}

/**
 * Looks up a hovered word under the first id free for hovers, which the operations choose,
 * so that none is shared with a request from an earlier screen.
 */
export function hoverLookupRequest(query: LookupQuery) {
  return {
    type: "sendRequestWithFreeId",
    prefix: hoverRequestPrefix,
    request: { kind: "lookupText", query },
  } satisfies Effect;
}

/** Tells whether a request id is that of a hover's lookup. */
export function isHoverRequestId(id: string): boolean {
  return id.startsWith(`${hoverRequestPrefix}/`);
}
