import { describe, expect, it } from "vitest";
import { failedImport } from "./failedImport.ts";

describe("failedImport", () => {
  it("names a file in a format no reader supports", () => {
    const failure = { code: "unsupported_dictionary_format", message: "no" };
    expect(failedImport("duden.lsd", failure)).toEqual({
      stage: "unsupported",
      fileName: "duden.lsd",
    });
  });

  it("asks for a file the browser no longer holds to be picked again", () => {
    const failure = { code: "browserFileGone", message: "gone" };
    expect(failedImport("jmdict.zip", failure)).toEqual({
      stage: "failed",
      message: "jmdict.zip is no longer available. Pick it again.",
    });
  });

  it("asks for a file to be picked again on a platform that holds no browser files", () => {
    const failure = { code: "browserFileUnreachable", message: "none" };
    expect(failedImport("jmdict.zip", failure)).toMatchObject({
      message: "jmdict.zip is no longer available. Pick it again.",
    });
  });

  it("says what the server reported for any other failure", () => {
    const failure = { code: "bad_request", message: "the index is broken" };
    expect(failedImport("jmdict.zip", failure)).toEqual({
      stage: "failed",
      message: "jmdict.zip could not be added: the index is broken",
    });
  });
});
