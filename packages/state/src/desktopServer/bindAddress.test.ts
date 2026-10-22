import { describe, expect, it } from "vitest";
import { lanBindOf, readBindAddress } from "./bindAddress.ts";

describe("readBindAddress", () => {
  it("reads an IPv4 address and a port", () => {
    expect(readBindAddress("0.0.0.0:8787")).toEqual({
      ok: true,
      address: { host: "0.0.0.0", port: 8787 },
    });
  });

  it("reads a bracketed IPv6 address and a port", () => {
    expect(readBindAddress("[::1]:8787")).toEqual({
      ok: true,
      address: { host: "[::1]", port: 8787 },
    });
  });

  it("asks for a port when there is none", () => {
    expect(readBindAddress("0.0.0.0")).toEqual({
      ok: false,
      problem: "Enter an IP address and a port, such as 0.0.0.0:8787.",
    });
  });

  it("refuses a host name, which the server cannot bind to", () => {
    expect(readBindAddress("localhost:8787").ok).toBe(false);
  });

  it("refuses an octet above 255", () => {
    expect(readBindAddress("192.168.1.256:8787").ok).toBe(false);
  });

  it("refuses a port above 65535", () => {
    expect(readBindAddress("0.0.0.0:70000")).toEqual({
      ok: false,
      problem: "The port must be a number from 1 to 65535.",
    });
  });

  it("refuses port 0", () => {
    expect(readBindAddress("0.0.0.0:0").ok).toBe(false);
  });
});

describe("lanBindOf", () => {
  it("listens on every interface at the port of a loopback address", () => {
    expect(lanBindOf("127.0.0.1:9000")).toBe("0.0.0.0:9000");
  });

  it("treats the IPv6 loopback address as loopback", () => {
    expect(lanBindOf("[::1]:9000")).toBe("0.0.0.0:9000");
  });

  it("keeps an address that already reaches the network", () => {
    expect(lanBindOf("192.168.1.5:8787")).toBeNull();
  });

  it("leaves an address it cannot read alone", () => {
    expect(lanBindOf("nonsense")).toBeNull();
  });
});
