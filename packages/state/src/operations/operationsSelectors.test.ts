import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { selectIsRequestInFlight } from "./operationsSelectors.ts";

const app = stateAfter(
  actions.settingsRequested(),
  actions.conversionCacheClearRequested(),
);

describe("selectIsRequestInFlight", () => {
  it("tells that a request sent and not settled is in flight", () => {
    expect(selectIsRequestInFlight(app, "settings/conversionCache/clear")).toBe(
      true,
    );
  });

  it("tells that a request with another id is not", () => {
    expect(
      selectIsRequestInFlight(app, "settings/conversionCache/budget"),
    ).toBe(false);
  });
});
