import { describe, expect, it } from "vitest";
import { describeDevice } from "./describeDevice.ts";

const chromeOnWindows =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const edgeOnWindows = `${chromeOnWindows} Edg/129.0.0.0`;
const safariOnMac =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const safariOnIPhone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const firefoxOnLinux =
  "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0";
const chromeOnAndroid =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
const desktopApp =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Tauri/2.0";

describe("describeDevice", () => {
  it("names Chrome on Windows", () => {
    expect(describeDevice(chromeOnWindows)).toBe("Chrome on Windows");
  });

  it("names Edge rather than the Chrome it is built on", () => {
    expect(describeDevice(edgeOnWindows)).toBe("Edge on Windows");
  });

  it("names Safari on macOS", () => {
    expect(describeDevice(safariOnMac)).toBe("Safari on macOS");
  });

  it("names the iPhone rather than the macOS its user agent mentions", () => {
    expect(describeDevice(safariOnIPhone)).toBe("Safari on iPhone");
  });

  it("names Firefox on Linux", () => {
    expect(describeDevice(firefoxOnLinux)).toBe("Firefox on Linux");
  });

  it("names Android rather than the Linux its user agent mentions", () => {
    expect(describeDevice(chromeOnAndroid)).toBe("Chrome on Android");
  });

  it("names the desktop app when its webview says so", () => {
    expect(describeDevice(desktopApp)).toBe("easyImmerse desktop app");
  });

  it("names the system alone when the browser is unknown", () => {
    expect(describeDevice("Mozilla/5.0 (Macintosh)")).toBe("macOS");
  });

  it("calls a device without a user agent unknown", () => {
    expect(describeDevice("")).toBe("Unknown device");
  });

  it("calls a device with an unrecognized user agent unknown", () => {
    expect(describeDevice("curl/8.7.1")).toBe("Unknown device");
  });
});
