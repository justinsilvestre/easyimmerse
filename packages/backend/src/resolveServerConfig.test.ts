import { afterEach, describe, expect, it } from "vitest";
import { resolveServerConfig } from "./resolveServerConfig.ts";

const injected = { serverUrl: "http://127.0.0.1:1", token: "injected" };
const fromEnv = {
  VITE_EASYIMMERSE_SERVER_URL: "http://127.0.0.1:2",
  VITE_EASYIMMERSE_TOKEN: "env",
};
const stored = { serverUrl: "http://127.0.0.1:3", token: "stored" };

function createFakeStorage(entries: Record<string, string>): Storage {
  const map = new Map(Object.entries(entries));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
}

const storedStorage = () =>
  createFakeStorage({ "easyimmerse.server": JSON.stringify(stored) });

afterEach(() => {
  globalThis.__EASYIMMERSE__ = undefined;
});

describe("resolveServerConfig", () => {
  it("prefers the config injected on globalThis", () => {
    globalThis.__EASYIMMERSE__ = injected;
    expect(resolveServerConfig(fromEnv, storedStorage())).toEqual(injected);
  });

  it("falls back to the Vite environment variables", () => {
    expect(resolveServerConfig(fromEnv, storedStorage())).toEqual({
      serverUrl: "http://127.0.0.1:2",
      token: "env",
    });
  });

  it("falls back to the entry in local storage", () => {
    expect(resolveServerConfig({}, storedStorage())).toEqual(stored);
  });

  it("ignores a malformed entry in local storage", () => {
    const storage = createFakeStorage({ "easyimmerse.server": "{oops" });
    expect(resolveServerConfig({}, storage)).toBeNull();
  });

  it("returns null when no source has a config", () => {
    expect(resolveServerConfig({}, null)).toBeNull();
  });
});
