import type { InstalledPlugin } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { mediaSourceOf } from "./mediaSourceOf.ts";

const origin = { plugin: "downloader", locator: "https://example.com/v" };
const downloaderPlugin: InstalledPlugin = {
  name: "downloader",
  title: "Video site",
  version: "0.4.0",
  kind: "media-source",
  import_label: "Add from a video site",
};

describe("mediaSourceOf", () => {
  it("names an installed plugin by its title", () => {
    expect(mediaSourceOf(origin, [downloaderPlugin])).toEqual({
      title: "Video site",
      isAvailable: true,
    });
  });

  it("names a plugin that is not installed by its name, as unavailable", () => {
    expect(mediaSourceOf(origin, [])).toEqual({
      title: "downloader",
      isAvailable: false,
    });
  });

  it("is null for a file that no plugin imported", () => {
    expect(mediaSourceOf(null, [downloaderPlugin])).toBeNull();
  });

  it("is null while the installed plugins are not known", () => {
    expect(mediaSourceOf(origin, undefined)).toBeNull();
  });
});
