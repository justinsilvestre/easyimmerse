import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPlatformSaveEffects } from "./platformSaveEffects.ts";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/path", () => ({
  appCacheDir: async () => "/data/app/cache",
  join: async (...parts: string[]) => parts.join("/"),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: vi.fn() }));

beforeEach(() => {
  vi.mocked(invoke).mockReset();
  vi.mocked(save).mockReset();
});

describe("createPlatformSaveEffects", () => {
  describe("on mobile", () => {
    it("answers a staging path in the app's cache directory", async () => {
      const { pickSavePath } = createPlatformSaveEffects("mobile");
      expect(await pickSavePath("Korean.apkg")).toEqual({
        kind: "staging",
        path: "/data/app/cache/Korean.apkg",
      });
    });

    it("opens no save dialog", async () => {
      await createPlatformSaveEffects("mobile").pickSavePath("Korean.apkg");
      expect(save).not.toHaveBeenCalled();
    });

    it("asks the save-copy plugin to let the user keep a copy", async () => {
      vi.mocked(invoke).mockResolvedValue({ saved: true });
      const { saveCopy } = createPlatformSaveEffects("mobile");
      await saveCopy("/data/app/cache/Korean.apkg", "Korean.apkg");
      expect(invoke).toHaveBeenCalledWith("plugin:save-copy|save_copy", {
        path: "/data/app/cache/Korean.apkg",
        fileName: "Korean.apkg",
        mimeType: "application/octet-stream",
      });
    });

    it("tells that the user kept a copy", async () => {
      vi.mocked(invoke).mockResolvedValue({ saved: true });
      const { saveCopy } = createPlatformSaveEffects("mobile");
      expect(await saveCopy("/cache/Korean.apkg", "Korean.apkg")).toEqual({
        kind: "saved",
      });
    });

    it("tells that the user cancelled", async () => {
      vi.mocked(invoke).mockResolvedValue({ saved: false });
      const { saveCopy } = createPlatformSaveEffects("mobile");
      expect(await saveCopy("/cache/Korean.apkg", "Korean.apkg")).toEqual({
        kind: "cancelled",
      });
    });
  });

  describe("on desktop", () => {
    it("answers the path chosen in the save dialog", async () => {
      vi.mocked(save).mockResolvedValue("/decks/Korean.apkg");
      const { pickSavePath } = createPlatformSaveEffects("desktop");
      expect(await pickSavePath("Korean.apkg")).toEqual({
        kind: "path",
        path: "/decks/Korean.apkg",
      });
    });

    it("refuses to keep a copy", async () => {
      const { saveCopy } = createPlatformSaveEffects("desktop");
      await expect(
        saveCopy("/decks/Korean.apkg", "Korean.apkg"),
      ).rejects.toThrow();
    });
  });
});
