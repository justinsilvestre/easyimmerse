import type { ConversionCacheStatus } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import type { RequestOutcome } from "../../server/serverRequest.ts";
import { updateConversionCache } from "./updateConversionCache.ts";

const status: ConversionCacheStatus = {
  usage_bytes: 0,
  limit_bytes: 5_000_000_000,
  budget_bytes: 5_000_000_000,
  free_bytes: 40_000_000_000,
  space_low: false,
  chosen_budget_bytes: null,
};

const cleared = (outcome: RequestOutcome<"clearConversionCache">) =>
  actions.requestSettled(
    "settings/conversionCache/clear",
    { kind: "clearConversionCache" },
    outcome,
  );

const budgetSet = (outcome: RequestOutcome<"setConversionCacheBudget">) =>
  actions.requestSettled(
    "settings/conversionCache/budget",
    { kind: "setConversionCacheBudget", budget: { budget_bytes: null } },
    outcome,
  );

const failure = (message: string) =>
  ({ ok: false, error: { status: 500, message } }) as const;

describe("updateConversionCache", () => {
  it("clears the cache when asked", () => {
    const [, effects] = updateConversionCache(
      null,
      actions.conversionCacheClearRequested(),
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "settings/conversionCache/clear",
        request: { kind: "clearConversionCache" },
      },
    ]);
  });

  it("sets the cache's maximum size when one is chosen", () => {
    const [, effects] = updateConversionCache(
      null,
      actions.conversionCacheBudgetChosen(2_000_000_000),
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "settings/conversionCache/budget",
        request: {
          kind: "setConversionCacheBudget",
          budget: { budget_bytes: 2_000_000_000 },
        },
      },
    ]);
  });

  it("reports a clearing that succeeded", () => {
    const [report] = updateConversionCache(
      null,
      cleared({ ok: true, data: status }),
    );
    expect(report).toBe("Cleared.");
  });

  it("reports the server's message for a clearing that failed", () => {
    const [report] = updateConversionCache(null, cleared(failure("disk busy")));
    expect(report).toBe("disk busy");
  });

  it("reports a clearing that failed without a message", () => {
    const [report] = updateConversionCache(null, cleared(failure("")));
    expect(report).toBe("The media cache could not be cleared.");
  });

  it("reports the server's message when the size could not be changed", () => {
    const [report] = updateConversionCache(
      null,
      budgetSet(failure("disk is read-only")),
    );
    expect(report).toBe("disk is read-only");
  });

  it("reports a failed size change without a message", () => {
    const [report] = updateConversionCache(null, budgetSet(failure("")));
    expect(report).toBe("The cache's maximum size could not be changed.");
  });

  it("keeps the report when a size change succeeds", () => {
    const [report] = updateConversionCache(
      "Cleared.",
      budgetSet({ ok: true, data: status }),
    );
    expect(report).toBe("Cleared.");
  });

  it("ignores a clearing that a later one replaced", () => {
    const [report] = updateConversionCache(
      "Cleared.",
      cleared({ ok: false, error: { status: "ABORTED", message: "aborted" } }),
    );
    expect(report).toBe("Cleared.");
  });
});
