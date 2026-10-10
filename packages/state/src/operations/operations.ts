import type { Feature } from "../app/feature.ts";

/** Work under way that any feature may ask about. It holds nothing yet. */
export type OperationsState = Record<never, never>;

/** The operations as a feature, which handles no action yet. */
export const operationsFeature: Feature<OperationsState> = {
  initialState: {},
  update: (operations) => [operations, []],
};
