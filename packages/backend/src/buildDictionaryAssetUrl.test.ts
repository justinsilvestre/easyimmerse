import { afterEach, describe, expect, it } from "vitest";
import type { BackendClient, BackendRequest } from "./backendClient.ts";
import { buildDictionaryAssetUrl } from "./buildDictionaryAssetUrl.ts";
import { configureBackend, resetBackend } from "./configureBackend.ts";

const send: BackendClient["send"] = async () => ({
  error: { status: "OFFLINE", message: "No server." },
});

const describeRequest = ({ path, query }: BackendRequest) =>
  `${path}?${new URLSearchParams(query)}`;

afterEach(resetBackend);

describe("buildDictionaryAssetUrl", () => {
  it("asks the client for the URL of the file inside the dictionary", () => {
    configureBackend({ send, resolveUrl: describeRequest });
    expect(buildDictionaryAssetUrl("d1", "img/cat.svg")).toBe(
      "/dictionaries/d1/asset?path=img%2Fcat.svg",
    );
  });

  it("returns null when the client cannot serve files by URL", () => {
    configureBackend({ send });
    expect(buildDictionaryAssetUrl("d1", "img/cat.svg")).toBeNull();
  });
});
