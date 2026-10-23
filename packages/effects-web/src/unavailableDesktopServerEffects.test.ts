import { describe, expect, it } from "vitest";
import { unavailableDesktopServerEffects } from "./unavailableDesktopServerEffects.ts";

describe("unavailableDesktopServerEffects", () => {
  it("refuses to start a server", async () => {
    await expect(
      unavailableDesktopServerEffects.startDesktopServer(),
    ).rejects.toThrow("The server controls are not available in this app.");
  });

  it("picks no program", async () => {
    expect(await unavailableDesktopServerEffects.pickExecutable()).toBeNull();
  });
});
