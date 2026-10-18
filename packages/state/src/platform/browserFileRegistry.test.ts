import { describe, expect, it } from "vitest";
import type { HeldFile } from "./browserFileRegistry.ts";
import { createBrowserFileRegistry } from "./browserFileRegistry.ts";

const clip: HeldFile = { name: "clip.webm", size: 1234, lastModified: 5678 };

describe("createBrowserFileRegistry", () => {
  it("describes a registered file as a browser_file source", () => {
    const registry = createBrowserFileRegistry();
    expect(registry.register(clip)).toEqual({
      kind: "browser_file",
      size: 1234,
      last_modified_ms: 5678,
    });
  });

  it("finds a registered file by its name and source", () => {
    const registry = createBrowserFileRegistry();
    const source = registry.register(clip);
    expect(registry.find("clip.webm", source)).toBe(clip);
  });

  it("finds nothing for a file with another size", () => {
    const registry = createBrowserFileRegistry();
    registry.register(clip);
    expect(
      registry.find("clip.webm", {
        kind: "browser_file",
        size: 1,
        last_modified_ms: 5678,
      }),
    ).toBeNull();
  });

  it("finds nothing for a path source", () => {
    const registry = createBrowserFileRegistry();
    registry.register(clip);
    expect(
      registry.find("clip.webm", { kind: "path", path: "/clip.webm" }),
    ).toBeNull();
  });
});
