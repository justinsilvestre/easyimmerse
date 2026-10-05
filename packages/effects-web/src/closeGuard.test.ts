import { afterEach, describe, expect, it } from "vitest";
import { createCloseGuard } from "./closeGuard.ts";

let guard = createCloseGuard();

afterEach(() => guard(false));

function closePage(): Event {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe("createCloseGuard", () => {
  it("asks the browser to confirm leaving the page while active", () => {
    guard = createCloseGuard();
    guard(true);
    expect(closePage().defaultPrevented).toBe(true);
  });

  it("lets the page go once lifted", () => {
    guard = createCloseGuard();
    guard(true);
    guard(false);
    expect(closePage().defaultPrevented).toBe(false);
  });

  it("lets the page go while never raised", () => {
    guard = createCloseGuard();
    expect(closePage().defaultPrevented).toBe(false);
  });
});
