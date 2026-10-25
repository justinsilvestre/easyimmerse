import type { InstalledPlugin } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { mediaSourceOf } from "./mediaSourceOf.ts";

const origin = { plugin: "example-plugin", locator: "https://example.com/v" };
const examplePlugin: InstalledPlugin = {
  name: "example-plugin",
  title: "Example plugin",
  version: "0.4.0",
  kind: "media-source",
  import_label: "Add with Example plugin",
};

describe("mediaSourceOf", () => {
  it("names an installed plugin by its title", () => {
    expect(mediaSourceOf(origin, [examplePlugin])).toEqual({
      title: "Example plugin",
      isAvailable: true,
    });
  });

  it("names a plugin that is not installed by its name, as unavailable", () => {
    expect(mediaSourceOf(origin, [])).toEqual({
      title: "example-plugin",
      isAvailable: false,
    });
  });

  it("is null for a file that no plugin imported", () => {
    expect(mediaSourceOf(null, [examplePlugin])).toBeNull();
  });

  it("is null while the installed plugins are not known", () => {
    expect(mediaSourceOf(origin, undefined)).toBeNull();
  });
});
