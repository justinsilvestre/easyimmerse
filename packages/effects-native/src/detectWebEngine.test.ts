import { describe, expect, it } from "vitest";
import { detectWebEngine } from "./detectWebEngine.ts";

const macAppUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)";
const chromeUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const firefoxUserAgent =
  "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0";
const safariUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15";
const firefoxOnIosUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15";
const chromeOnIosUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.0.0 Mobile/15E148 Safari/604.1";

describe("detectWebEngine", () => {
  it("detects WebKit in the macOS app's web view", () => {
    expect(detectWebEngine(macAppUserAgent)).toBe("webkit");
  });

  it("detects Chromium in Chrome", () => {
    expect(detectWebEngine(chromeUserAgent)).toBe("chromium");
  });

  it("detects Gecko in Firefox", () => {
    expect(detectWebEngine(firefoxUserAgent)).toBe("gecko");
  });

  it("detects WebKit in Safari", () => {
    expect(detectWebEngine(safariUserAgent)).toBe("webkit");
  });

  it("detects WebKit in Firefox on iOS, which must use WebKit", () => {
    expect(detectWebEngine(firefoxOnIosUserAgent)).toBe("webkit");
  });

  it("detects WebKit in Chrome on iOS, which must use WebKit", () => {
    expect(detectWebEngine(chromeOnIosUserAgent)).toBe("webkit");
  });

  it("falls back to WebKit for an unknown user agent", () => {
    expect(detectWebEngine("curl/8.0")).toBe("webkit");
  });
});
