import type { Effect } from "../../app/effect.ts";

/** The id of the request that removes a dictionary. Each dictionary has its own, so that two removals run side by side. */
export const dictionaryRemovalId = (dictionaryId: string) =>
  `settings/dictionaries/remove/${dictionaryId}`;

/** Removes a dictionary once the user has confirmed it. */
export function removeDictionary(dictionaryId: string): Effect {
  return {
    type: "sendRequest",
    id: dictionaryRemovalId(dictionaryId),
    request: { kind: "deleteDictionary", dictionaryId },
  };
}
