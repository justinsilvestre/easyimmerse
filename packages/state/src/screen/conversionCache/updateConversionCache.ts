import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { isAborted } from "../../server/isAborted.ts";
import { isSettled } from "../../server/isSettled.ts";
import { conversionCacheRequestId } from "./conversionCacheRequestId.ts";

/**
 * Clears the media cache and sets its maximum size when asked,
 * and keeps the line that reports how the last clearing, or a failed size change, went.
 */
export function updateConversionCache(
  report: string | null,
  action: AppAction,
): readonly [string | null, readonly Effect[]] {
  switch (action.type) {
    case "conversionCacheClearRequested":
      return [
        report,
        [
          {
            type: "sendRequest",
            id: conversionCacheRequestId("clear"),
            request: { kind: "clearConversionCache" },
          },
        ],
      ];
    case "conversionCacheBudgetChosen":
      return [
        report,
        [
          {
            type: "sendRequest",
            id: conversionCacheRequestId("budget"),
            request: {
              kind: "setConversionCacheBudget",
              budget: { budget_bytes: action.budgetBytes },
            },
          },
        ],
      ];
    case "requestSettled":
      return [reportAfter(report, action), []];
    default:
      return [report, []];
  }
}

function reportAfter(
  report: string | null,
  action: Extract<AppAction, { type: "requestSettled" }>,
): string | null {
  if (isAborted(action.outcome)) return report;
  if (
    isSettled(action, conversionCacheRequestId("clear"), "clearConversionCache")
  )
    return action.outcome.ok
      ? "Cleared."
      : action.outcome.error.message || "The media cache could not be cleared.";
  if (
    isSettled(
      action,
      conversionCacheRequestId("budget"),
      "setConversionCacheBudget",
    ) &&
    !action.outcome.ok
  )
    return (
      action.outcome.error.message ||
      "The cache's maximum size could not be changed."
    );
  return report;
}
