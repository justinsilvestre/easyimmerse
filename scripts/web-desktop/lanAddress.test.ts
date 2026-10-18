import assert from "node:assert/strict";
import type { NetworkInterfaceInfo } from "node:os";
import { describe, it } from "node:test";

import { selectLanAddress } from "./lanAddress.ts";

function entry(
  address: string,
  family: "IPv4" | "IPv6",
  internal: boolean,
): NetworkInterfaceInfo {
  const base = { address, netmask: "", mac: "", internal, cidr: null };
  return family === "IPv4"
    ? { ...base, family }
    : { ...base, family, scopeid: 0 };
}

describe("selectLanAddress", () => {
  it("returns the first non-internal IPv4 address", () => {
    const address = selectLanAddress({
      lo0: [entry("127.0.0.1", "IPv4", true)],
      en0: [
        entry("fe80::1", "IPv6", false),
        entry("192.168.1.5", "IPv4", false),
      ],
    });
    assert.equal(address, "192.168.1.5");
  });

  it("ignores internal addresses", () => {
    const address = selectLanAddress({
      lo0: [entry("127.0.0.1", "IPv4", true)],
    });
    assert.equal(address, null);
  });

  it("ignores IPv6 addresses", () => {
    const address = selectLanAddress({
      en0: [entry("fe80::1", "IPv6", false)],
    });
    assert.equal(address, null);
  });

  it("prefers an address in a private range", () => {
    const address = selectLanAddress({
      utun4: [entry("100.64.0.2", "IPv4", false)],
      en0: [entry("172.20.1.5", "IPv4", false)],
    });
    assert.equal(address, "172.20.1.5");
  });

  it("keeps the order among private addresses", () => {
    const address = selectLanAddress({
      en0: [entry("192.168.1.5", "IPv4", false)],
      bridge100: [entry("10.0.0.1", "IPv4", false)],
    });
    assert.equal(address, "192.168.1.5");
  });

  it("falls back to a public address", () => {
    const address = selectLanAddress({
      en0: [entry("172.32.0.1", "IPv4", false)],
    });
    assert.equal(address, "172.32.0.1");
  });

  it("returns the override instead of a detected address", () => {
    const address = selectLanAddress(
      { en0: [entry("192.168.1.5", "IPv4", false)] },
      "10.1.2.3",
    );
    assert.equal(address, "10.1.2.3");
  });

  it("returns null without any interface", () => {
    assert.equal(selectLanAddress({}), null);
  });
});
