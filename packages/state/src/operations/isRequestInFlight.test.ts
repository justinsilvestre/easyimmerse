import { describe, expect, it } from "vitest";
import { isRequestInFlight } from "./isRequestInFlight.ts";
import type { OperationsState } from "./operations.ts";

const sending: OperationsState = {
  requests: [
    {
      id: "settings/conversionCache/clear",
      request: { kind: "clearConversionCache" },
      isWaiting: false,
    },
  ],
  jobs: {},
  lookupRequestsSent: 0,
};

describe("isRequestInFlight", () => {
  it("tells that a request sent and not settled is in flight", () => {
    expect(isRequestInFlight(sending, "settings/conversionCache/clear")).toBe(
      true,
    );
  });

  it("tells that a request with another id is not", () => {
    expect(isRequestInFlight(sending, "settings/conversionCache/budget")).toBe(
      false,
    );
  });
});
