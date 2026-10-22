import { actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { backupSignTexts } from "./backupSignTexts.ts";

const openAccountSettings = actions.navigated({ type: "openAccountSettings" });

const now = new Date(2026, 9, 22, 15, 30).getTime();

const linkUnreachable = (platform: "desktop" | "mobile", sinceMs: number) =>
  ({
    kind: "linkUnreachable",
    platform,
    serverUrl: "https://cloud.example.org",
    sinceMs,
  }) as const;

const linkFailed = {
  kind: "linkFailed",
  platform: "desktop",
  serverUrl: "https://cloud.example.org",
  code: "internal",
} as const;

const tryAgain = { label: "Try again", actions: [actions.syncRunRequested()] };

const loggedOut = (platform: "desktop" | "mobile") =>
  ({
    kind: "loggedOut",
    platform,
    serverUrl: "https://cloud.example.org",
    email: "someone@example.org",
  }) as const;

const deviceOnly = (platform: "desktop" | "mobile", hasOfficialServer = true) =>
  ({ kind: "deviceOnly", platform, hasOfficialServer }) as const;

describe("backupSignTexts", () => {
  it("gives nothing for a hidden sign", () => {
    expect(backupSignTexts({ kind: "hidden" })).toBeNull();
  });

  it("explains that flashcards are stored only in this browser", () => {
    expect(backupSignTexts({ kind: "browserOnly" })?.explanation).toBe(
      "Your flashcards are currently only stored in this browser. If your browser data gets cleared, you may lose all your work.",
    );
  });

  it("offers to log in while flashcards are kept only in this browser", () => {
    expect(backupSignTexts({ kind: "browserOnly" })?.options).toEqual([
      { label: "Log in or sign up", actions: [openAccountSettings] },
    ]);
  });

  it("explains that failed saves are kept in this browser until they're saved", () => {
    expect(backupSignTexts({ kind: "failedSaves" })?.explanation).toBe(
      "Some flashcards haven't been saved to your server yet. Until they are, they're stored only in this browser, and you may lose them if your browser data gets cleared.",
    );
  });

  it("offers no way to log in for failed saves", () => {
    expect(backupSignTexts({ kind: "failedSaves" })?.options).toEqual([]);
  });

  it("explains that work is stored only on this computer", () => {
    expect(backupSignTexts(deviceOnly("desktop"))?.explanation).toBe(
      "Your work is currently being stored only on this computer. If the computer is lost or its disk fails, you may lose all your work. Log in to the easyImmerse cloud or to your own server to back it up there.",
    );
  });

  it("explains that work is stored only on this phone or tablet", () => {
    expect(backupSignTexts(deviceOnly("mobile"))?.explanation).toBe(
      "Your work is currently being stored only on this device. If the device is lost or the app is deleted, you may lose all your work. Log in to the easyImmerse cloud or to your own server to back it up there.",
    );
  });

  it("names only the person's own server when the easyImmerse cloud is not offered", () => {
    expect(backupSignTexts(deviceOnly("desktop", false))?.explanation).toBe(
      "Your work is currently being stored only on this computer. If the computer is lost or its disk fails, you may lose all your work. Log in to your own easyImmerse server to back it up there.",
    );
  });

  it("offers to log in while work is kept only on the device", () => {
    expect(backupSignTexts(deviceOnly("mobile"))?.options[0]?.label).toBe(
      "Log in or sign up",
    );
  });

  describe("while the remote cannot be reached", () => {
    it("explains since when the latest work hasn't been backed up", () => {
      const since = new Date(2026, 9, 22, 14, 5).getTime();
      expect(
        backupSignTexts(linkUnreachable("desktop", since), now)?.explanation,
      ).toBe(
        "cloud.example.org couldn't be reached since 2:05 PM, so your latest work hasn't been backed up there yet. It will be backed up once the server can be reached.",
      );
    });

    it("offers to try again", () => {
      expect(
        backupSignTexts(linkUnreachable("desktop", 0), now)?.options,
      ).toEqual([tryAgain]);
    });
  });

  describe("after a round failed", () => {
    it("explains why the latest work hasn't been backed up", () => {
      expect(backupSignTexts(linkFailed)?.explanation).toBe(
        "Your latest work hasn't been backed up to cloud.example.org. cloud.example.org ran into a problem of its own. Trying again later may help.",
      );
    });

    it("offers to try again or open the account settings", () => {
      expect(backupSignTexts(linkFailed)?.options).toEqual([
        tryAgain,
        { label: "Open account settings", actions: [openAccountSettings] },
      ]);
    });
  });

  describe("while the remote logged the app out", () => {
    it("explains that the latest work hasn't been backed up", () => {
      expect(backupSignTexts(loggedOut("desktop"))?.explanation).toBe(
        "You were logged out of cloud.example.org on this computer, so your latest work hasn't been backed up there. Log in again to back it up.",
      );
    });

    it("names this device on a phone or tablet", () => {
      expect(backupSignTexts(loggedOut("mobile"))?.explanation).toBe(
        "You were logged out of cloud.example.org on this device, so your latest work hasn't been backed up there. Log in again to back it up.",
      );
    });

    it("offers to log in again to the remote as the same account", () => {
      expect(backupSignTexts(loggedOut("desktop"))?.options).toEqual([
        {
          label: "Log in again",
          actions: [
            actions.relinkRequested(
              "https://cloud.example.org",
              "someone@example.org",
            ),
            openAccountSettings,
          ],
        },
      ]);
    });
  });
});
