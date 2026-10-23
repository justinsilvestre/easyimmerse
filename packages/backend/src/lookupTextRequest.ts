import type { LookupQuery } from "@easyimmerse/types";
import type { BackendRequest } from "./backendClient.ts";

/** Builds the request that looks up the beginning of a text in every dictionary. */
export function lookupTextRequest(lookup: LookupQuery): BackendRequest {
  return {
    method: "GET",
    path: "/dictionaries/lookup",
    query: {
      text: lookup.text,
      language: lookup.language,
      ...lookupContextQuery(lookup.context, lookup.offset),
    },
  };
}

/** Encodes the text around a looked-up character, when the caller has it, as query parameters. */
const lookupContextQuery = (
  context: string | undefined,
  offset: number | undefined,
): Record<string, string> =>
  context === undefined || offset === undefined
    ? {}
    : { context, offset: String(offset) };
