import type { Feature } from "../app/feature.ts";

/**
 * Work under way that any feature may ask about: requests in flight and polled server jobs, among them the per-flashcard save queues as scoped requests.
 * Empty until the requests arrive.
 */
export type OperationsState = Record<never, never>;

export const operationsFeature: Feature<OperationsState> = {
  initialState: {},
  update: (operations) => [operations, []],
};
