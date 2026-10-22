import { describe, expect, it } from "vitest";
import { isCloudServer, serverNameOf } from "./serverNameOf.ts";

const cloudUrl = "https://cloud.example.org";

describe("serverNameOf", () => {
  it("names the easyImmerse cloud by that name", () => {
    expect(serverNameOf("https://cloud.example.org/", cloudUrl)).toBe(
      "the easyImmerse cloud",
    );
  });

  it("names another server by its host", () => {
    expect(serverNameOf("https://books.example.org", cloudUrl)).toBe(
      "books.example.org",
    );
  });

  it("names a server by its host when the app knows of no cloud", () => {
    expect(serverNameOf("https://cloud.example.org", null)).toBe(
      "cloud.example.org",
    );
  });
});

describe("isCloudServer", () => {
  it("tells that another server is not the cloud", () => {
    expect(isCloudServer("https://books.example.org", cloudUrl)).toBe(false);
  });
});
