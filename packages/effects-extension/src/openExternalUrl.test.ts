import { describe, expect, it } from "vitest";
import { createOpenExternalUrl } from "./openExternalUrl.ts";

describe("createOpenExternalUrl", () => {
  it("creates a tab at the given URL", () => {
    const createdTabs: { url: string }[] = [];
    const openExternalUrl = createOpenExternalUrl(async (properties) => {
      createdTabs.push(properties);
    });
    openExternalUrl("https://example.com/help");
    expect(createdTabs).toEqual([{ url: "https://example.com/help" }]);
  });
});
