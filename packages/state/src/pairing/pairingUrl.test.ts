import { describe, expect, it } from "vitest";
import { pairingUrlOf, parsePairingUrl } from "./pairingUrl.ts";

describe("parsePairingUrl", () => {
  it("reads the server and the code of a pairing URL", () => {
    expect(parsePairingUrl("http://192.168.1.5:8787/#pair=123456")).toEqual({
      serverUrl: "http://192.168.1.5:8787",
      code: "123456",
    });
  });

  it("reads a pairing URL without a code as a server alone", () => {
    expect(parsePairingUrl("https://books.example.org/")).toEqual({
      serverUrl: "https://books.example.org",
      code: null,
    });
  });

  it("takes an address without a scheme as HTTP", () => {
    expect(parsePairingUrl(" 192.168.1.5:8787 ")?.serverUrl).toBe(
      "http://192.168.1.5:8787",
    );
  });

  it("keeps only the origin of an address with a path", () => {
    expect(parsePairingUrl("http://192.168.1.5:8787/projects")?.serverUrl).toBe(
      "http://192.168.1.5:8787",
    );
  });

  it("refuses a scheme other than HTTP or HTTPS", () => {
    expect(parsePairingUrl("ftp://192.168.1.5")).toBeNull();
  });

  it("refuses text with spaces", () => {
    expect(parsePairingUrl("not an address")).toBeNull();
  });

  it("refuses empty text", () => {
    expect(parsePairingUrl("")).toBeNull();
  });

  it("ignores an empty code", () => {
    expect(parsePairingUrl("http://192.168.1.5:8787/#pair=")?.code).toBeNull();
  });
});

describe("pairingUrlOf", () => {
  it("puts the code in the fragment", () => {
    expect(pairingUrlOf("http://192.168.1.5:8787", "123456")).toBe(
      "http://192.168.1.5:8787/#pair=123456",
    );
  });

  it("gives the server's root without a code", () => {
    expect(pairingUrlOf("http://192.168.1.5:8787/", null)).toBe(
      "http://192.168.1.5:8787/",
    );
  });
});

describe("parsePairingUrl with unusual addresses", () => {
  it("drops the default port", () => {
    expect(parsePairingUrl("https://books.example.org:443/")?.serverUrl).toBe(
      "https://books.example.org",
    );
  });

  it("refuses an address with a password in it", () => {
    expect(parsePairingUrl("http://user:pass@192.168.1.5")).toBeNull();
  });

  it("refuses a Wi-Fi QR code", () => {
    expect(parsePairingUrl("WIFI:S:Home;T:WPA;P:secret;;")).toBeNull();
  });
});
