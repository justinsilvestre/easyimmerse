import type { ServerCacheSlice } from "@easyimmerse/state";
import { describe, expectTypeOf, it } from "vitest";
import type { backendApi } from "./backendApi.ts";

type BackendSlice = ReturnType<typeof backendApi.reducer>;

describe("backendApi", () => {
  it("keeps a slice that the state package can read as the server cache", () => {
    expectTypeOf<BackendSlice>().toExtend<ServerCacheSlice>();
  });
});
