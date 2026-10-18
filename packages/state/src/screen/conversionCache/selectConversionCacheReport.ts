import type { AppRoot } from "../../app/createAppStore.ts";
import { selectIsRequestInFlight } from "../../operations/operationsSelectors.ts";
import { conversionCacheRequestId } from "./conversionCacheRequestId.ts";

/** Selects the line shown beside Clear: "Clearing…" while a clearing is in flight, else the last report, or nothing. */
export const selectConversionCacheReport = (state: AppRoot): string =>
  selectIsRequestInFlight(state.app, conversionCacheRequestId("clear"))
    ? "Clearing…"
    : (state.app.screen.settings?.conversionCacheReport ?? "");
