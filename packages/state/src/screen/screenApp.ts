import type { ReadableState } from "../app/feature.ts";

/** The slices that the screens' updates read, as they were before the action. */
export type ScreenApp = Pick<
  ReadableState,
  | "route"
  | "screen"
  | "server"
  | "storedPlaces"
  | "preferences"
  | "operations"
  | "backend"
>;
