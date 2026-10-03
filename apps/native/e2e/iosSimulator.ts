import { execFileSync } from "node:child_process";

/** The simulator the iOS tests run on. It is created as an iPhone 16 on the runtime of the selected Xcode's SDK when missing. */
const simulatorName = "easyImmerse e2e";
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
  return simctl("create", simulatorName, deviceType, sdkRuntime()).trim();
}

/**
 * The runtime whose version matches the iOS SDK of the selected Xcode.
 * Appium looks for a simulator of that version when no other is named,
 * and a machine with several Xcode versions has runtimes of several versions.
 */
function sdkRuntime(): string {
  const sdkVersion = xcrun(
    "--sdk",
    "iphonesimulator",
    "--show-sdk-version",
  ).trim();
  const listing = JSON.parse(simctl("list", "runtimes", "available", "-j"));
  const runtimes = listing.runtimes as Runtime[];
  const runtime = runtimes.find(
    (candidate) => candidate.version === sdkVersion,
  );
  if (runtime === undefined) {
    throw new Error(`no iOS ${sdkVersion} simulator runtime is installed`);
  }
  return runtime.identifier;
}

function simctl(...args: string[]): string {
  return xcrun("simctl", ...args);
}

function xcrun(...args: string[]): string {
  return execFileSync("xcrun", args, { encoding: "utf8" });
}

interface Device {
  name: string;
  udid: string;
}

interface Runtime {
  identifier: string;
  version: string;
}
