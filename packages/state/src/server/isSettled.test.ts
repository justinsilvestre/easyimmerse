import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { isSettled } from "./isSettled.ts";
import type { ServerRequest } from "./serverRequest.ts";

const listRequest: ServerRequest = { kind: "listMediaFiles", projectId: "p1" };

const listed = actions.requestSettled("a", listRequest, {
  ok: true,
  data: { media_files: [] },
});

describe("isSettled", () => {
  it("accepts the end of the request with the given id and kind", () => {
    expect(isSettled(listed, "a", "listMediaFiles")).toBe(true);
  });

  it("rejects the end of a request with another id", () => {
    expect(isSettled(listed, "b", "listMediaFiles")).toBe(false);
  });

  it("rejects the end of a request of another kind", () => {
    expect(isSettled(listed, "a", "addMediaFile")).toBe(false);
  });

  it("rejects an action that is not the end of a request", () => {
    expect(isSettled(actions.closeMedia(), "a", "listMediaFiles")).toBe(false);
  });
});
