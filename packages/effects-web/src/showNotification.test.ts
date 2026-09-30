import { afterEach, describe, expect, it, vi } from "vitest";
import { showNotification } from "./showNotification.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("showNotification", () => {
  it("adds a status element with the message", () => {
    showNotification("Copied to clipboard");
    expect(document.body.querySelector("[role=status]")?.textContent).toBe(
      "Copied to clipboard",
    );
  });

  it("removes the status element after three seconds", () => {
    vi.useFakeTimers();
    showNotification("Copied to clipboard");
    vi.advanceTimersByTime(3000);
    expect(document.body.querySelector("[role=status]")).toBeNull();
  });
});
