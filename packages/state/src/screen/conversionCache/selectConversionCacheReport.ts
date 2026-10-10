import type { RootState } from "../../app/createAppStore.ts";
import { isRequestInFlight } from "../../operations/isRequestInFlight.ts";
import { conversionCacheIds } from "./conversionCacheIds.ts";

/** Selects the line shown beside Clear: "Clearing…" while a clearing is in flight, else the last report, or nothing. */
export const selectConversionCacheReport = (state: RootState): string =>
  isRequestInFlight(state.app.operations, conversionCacheIds.clear)
    ? "Clearing…"
    : (state.app.screen.settings?.conversionCacheReport ?? "");
