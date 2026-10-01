import { describe, expect, it, vi } from "vitest";
import { createShowNotification } from "./showNotification.ts";

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("createShowNotification", () => {
  it("sends the message to the operating system", async () => {
    const send = vi.fn().mockResolvedValue(true);
    createShowNotification(send, () => {})("Copied");
    await settle();
    expect(send).toHaveBeenCalledWith("Copied");
  });

  it("does not fall back when the notification was sent", async () => {
    const fallback = vi.fn();
    createShowNotification(async () => true, fallback)("Copied");
    await settle();
    expect(fallback).not.toHaveBeenCalled();
  });

  it("falls back when permission is denied", async () => {
    const fallback = vi.fn();
    createShowNotification(async () => false, fallback)("Copied");
    await settle();
    expect(fallback).toHaveBeenCalledWith("Copied");
  });

  it("falls back when the plugin fails", async () => {
    const fallback = vi.fn();
    const failing = () => Promise.reject(new Error("no plugin"));
    createShowNotification(failing, fallback)("Copied");
    await settle();
    expect(fallback).toHaveBeenCalledWith("Copied");
  });
});
