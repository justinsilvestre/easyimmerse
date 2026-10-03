import { execFileSync } from "node:child_process";

/** The simulator the iOS tests run on. It is created from the newest installed iPhone 16 runtime when missing. */
export const simulatorName = "easyImmerse e2e";
const deviceType = "iPhone 16";

/** Creates the simulator when it is missing, boots it, and returns its identifier. */
export function prepareSimulator(): string {
  const udid = findSimulator() ?? createSimulator();
  simctl("bootstatus", udid, "-b");
  return udid;
}

export function uninstallApp(udid: string, bundleId: string) {
  simctl("uninstall", udid, bundleId);
}

function findSimulator(): string | undefined {
  const listing = JSON.parse(simctl("list", "devices", "available", "-j"));
  const devices = Object.values(listing.devices as Record<string, Device[]>);
  return devices.flat().find((device) => device.name === simulatorName)?.udid;
}

function createSimulator(): string {
  return simctl("create", simulatorName, deviceType).trim();
}

function simctl(...args: string[]): string {
  return execFileSync("xcrun", ["simctl", ...args], { encoding: "utf8" });
}

interface Device {
  name: string;
  udid: string;
}
