import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { isRequestInFlight } from "./isRequestInFlight.ts";

const { operations } = stateAfter(
  actions.settingsRequested(),
  actions.conversionCacheClearRequested(),
);

describe("isRequestInFlight", () => {
  it("tells that a request sent and not settled is in flight", () => {
    expect(
      isRequestInFlight(operations, "settings/conversionCache/clear"),
    ).toBe(true);
  });

  it("tells that a request with another id is not", () => {
    expect(
      isRequestInFlight(operations, "settings/conversionCache/budget"),
    ).toBe(false);
  });
});
