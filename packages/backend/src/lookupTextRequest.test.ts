import { describe, expect, it } from "vitest";
import { lookupTextRequest } from "./lookupTextRequest.ts";

describe("lookupTextRequest", () => {
  it("sends the context and offset when the lookup has both", () => {
    const request = lookupTextRequest({
      text: "Hund bellt",
      language: "de",
      context: "Der Hund bellt",
      offset: 4,
    });
    expect(request.query).toEqual({
      text: "Hund bellt",
      language: "de",
      context: "Der Hund bellt",
      offset: "4",
    });
  });

  it("leaves out a context that comes without an offset", () => {
    const request = lookupTextRequest({
      text: "Hund",
      language: "de",
      context: "Der Hund",
    });
    expect(request.query).toEqual({ text: "Hund", language: "de" });
  });
});
