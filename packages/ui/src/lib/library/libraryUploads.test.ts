import { createBrowserFileRegistry } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { uploadFromRegistry } from "./libraryUploads.ts";

const file = new File(["v"], "park.mp4", { lastModified: 5 });
const source = { kind: "browser_file", size: 1, last_modified_ms: 5 } as const;

describe("uploadFromRegistry", () => {
  it("holds the file while the upload reads it", async () => {
    const registry = createBrowserFileRegistry<File>();
    const held = await uploadFromRegistry(registry, file, async (picked) =>
      registry.find(picked.name, picked.source),
    );
    expect(held).toBe(file);
  });

  it("lets go of the file once the upload settles", async () => {
    const registry = createBrowserFileRegistry<File>();
    await uploadFromRegistry(registry, file, async () => null).catch(
      () => null,
    );
    expect(registry.find("park.mp4", source)).toBeNull();
  });

  it("keeps a file the registry held before", async () => {
    const registry = createBrowserFileRegistry<File>();
    registry.register(file);
    await uploadFromRegistry(registry, file, async () => null);
    expect(registry.find("park.mp4", source)).toBe(file);
  });
});
