import type { RequestRecord } from "./operations.ts";

/**
 * Returns the first id under a prefix, numbered from 1, that no recorded request has.
 * A request stays recorded until it settles, and the request table drops the outcome of an earlier request sent under the same id,
 * so an id is free to use again once its request has settled.
 */
export function freeRequestId(
  prefix: string,
  requests: readonly RequestRecord[],
): string {
  const used = new Set(requests.map(({ id }) => id));
  let number = 1;
  while (used.has(`${prefix}/${number}`)) number += 1;
  return `${prefix}/${number}`;
}
