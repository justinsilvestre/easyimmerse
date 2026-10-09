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

  it("returns null without any interface", () => {
    assert.equal(selectLanAddress({}), null);
  });
});
