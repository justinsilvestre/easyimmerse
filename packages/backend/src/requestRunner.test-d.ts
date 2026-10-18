import type { ServerRequestKind, ServerResponses } from "@easyimmerse/state";
import { describe, expectTypeOf, it } from "vitest";
import type { requestEndpoints } from "./requestRunner.ts";

type EndpointResult<K extends ServerRequestKind> = Awaited<
  ReturnType<ReturnType<ReturnType<(typeof requestEndpoints)[K]>>["unwrap"]>
>;

describe("requestEndpoints", () => {
  it("give each kind of request the data ServerResponses names for it", () => {
    expectTypeOf<{
      [K in ServerRequestKind]: EndpointResult<K>;
    }>().toEqualTypeOf<ServerResponses>();
  });
});
