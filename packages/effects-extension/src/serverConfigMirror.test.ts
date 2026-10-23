import { describe, expect, it } from "vitest";
import {
  type MirrorStorageArea,
  mirrorServerConfig,
  readMirroredServerConfig,
} from "./serverConfigMirror.ts";

const server = { serverUrl: "http://127.0.0.1:8787", token: "secret" };

function createFakeArea(
  entries: Record<string, unknown> = {},
): MirrorStorageArea {
  const map = new Map(Object.entries(entries));
  return {
    get: async (key) => (map.has(key) ? { [key]: map.get(key) } : {}),
    set: async (items) => {
      for (const [key, value] of Object.entries(items)) map.set(key, value);
    },
    remove: async (key) => void map.delete(key),
  };
}

describe("readMirroredServerConfig", () => {
  it("reads back the server that was mirrored", async () => {
    const area = createFakeArea();
    await mirrorServerConfig(area, server);
    expect(await readMirroredServerConfig(area)).toEqual(server);
  });

  it("reads no server once none is mirrored", async () => {
    const area = createFakeArea();
    await mirrorServerConfig(area, server);
    await mirrorServerConfig(area, null);
    expect(await readMirroredServerConfig(area)).toBeNull();
  });

  it("reads no server from a malformed entry", async () => {
    const area = createFakeArea({ "easyimmerse.server": { token: 1 } });
    expect(await readMirroredServerConfig(area)).toBeNull();
  });
});
