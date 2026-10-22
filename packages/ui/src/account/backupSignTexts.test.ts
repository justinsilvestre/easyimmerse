import { actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { backupSignTexts } from "./backupSignTexts.ts";

const openAccountSettings = actions.navigated({ type: "openAccountSettings" });

const now = new Date(2026, 9, 22, 15, 30).getTime();

const linkFailing = (platform: "desktop" | "mobile", sinceMs: number | null) =>
  ({
    kind: "linkFailing",
    platform,
    serverUrl: "https://cloud.example.org",
    sinceMs,
  }) as const;

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

  it("explains that flashcards are kept only in this browser", () => {
    expect(backupSignTexts({ kind: "browserOnly" })?.explanation).toBe(
      "Your flashcards aren't backed up. They're stored only in this browser, so you'll lose them if its data is cleared.",
    );
  });

  it("offers to log in while flashcards are kept only in this browser", () => {
    expect(backupSignTexts({ kind: "browserOnly" })?.button).toEqual({
      label: "Log in or sign up",
      actions: [openAccountSettings],
    });
  });

  it("explains that failed saves are kept in this browser until they're saved", () => {
    expect(backupSignTexts({ kind: "failedSaves" })?.explanation).toBe(
      "Some flashcards couldn't be saved to your server yet. They're kept in this browser until they're saved, so you'll lose them if its data is cleared.",
    );
  });

  it("offers no way to log in for failed saves", () => {
    expect(backupSignTexts({ kind: "failedSaves" })?.button).toBeNull();
  });

  it("explains that work is kept only on this computer", () => {
    expect(backupSignTexts(deviceOnly("desktop"))?.explanation).toBe(
      "Your work is kept only on this computer, so you'll lose it if the computer is lost or its disk fails. Log in to the easyImmerse cloud or to your own server to keep a copy there.",
    );
  });

  it("explains that work is kept only on this phone or tablet", () => {
    expect(backupSignTexts(deviceOnly("mobile"))?.explanation).toBe(
      "Your work is kept only on this device, so you'll lose it if the device is lost or the app is deleted. Log in to the easyImmerse cloud or to your own server to keep a copy there.",
    );
  });

  it("names only the person's own server when the easyImmerse cloud is not offered", () => {
    expect(backupSignTexts(deviceOnly("desktop", false))?.explanation).toBe(
      "Your work is kept only on this computer, so you'll lose it if the computer is lost or its disk fails. Log in to your own easyImmerse server to keep a copy there.",
    );
  });

  it("offers to log in while work is kept only on the device", () => {
    expect(backupSignTexts(deviceOnly("mobile"))?.button?.label).toBe(
      "Log in or sign up",
    );
  });

  describe("while the remote cannot be reached", () => {
    it("explains since when the latest work is kept only on this computer", () => {
      const since = new Date(2026, 9, 22, 14, 5).getTime();
      expect(
        backupSignTexts(linkFailing("desktop", since), now)?.explanation,
      ).toBe(
        "Your latest work is kept only on this computer, because cloud.example.org couldn't be reached since 2:05 PM. It will be copied there when the server can be reached.",
      );
    });

    it("names this device on a phone or tablet", () => {
      const since = new Date(2026, 9, 22, 14, 5).getTime();
      expect(
        backupSignTexts(linkFailing("mobile", since), now)?.explanation,
      ).toBe(
        "Your latest work is kept only on this device, because cloud.example.org couldn't be reached since 2:05 PM. It will be copied there when the server can be reached.",
      );
    });

    it("offers to open the account settings", () => {
      expect(backupSignTexts(linkFailing("desktop", 0), now)?.button).toEqual({
        label: "Open account settings",
        actions: [openAccountSettings],
      });
    });
  });

  it("explains that the work couldn't be copied to the remote", () => {
    expect(
      backupSignTexts(linkFailing("desktop", null), now)?.explanation,
    ).toBe(
      "Your latest work is kept only on this computer, because it couldn't be copied to cloud.example.org. Open the account settings to see why.",
    );
  });

  describe("while the remote logged the app out", () => {
    it("explains that the latest work is kept only on this computer", () => {
      expect(backupSignTexts(loggedOut("desktop"))?.explanation).toBe(
        "You were logged out of cloud.example.org on this computer, so your latest work is kept only here. Log in again to keep a copy there.",
      );
    });

    it("names this device on a phone or tablet", () => {
      expect(backupSignTexts(loggedOut("mobile"))?.explanation).toBe(
        "You were logged out of cloud.example.org on this device, so your latest work is kept only here. Log in again to keep a copy there.",
      );
    });

    it("offers to log in again to the remote as the same account", () => {
      expect(backupSignTexts(loggedOut("desktop"))?.button).toEqual({
        label: "Log in again",
        actions: [
          actions.relinkRequested(
            "https://cloud.example.org",
            "someone@example.org",
          ),
          openAccountSettings,
        ],
      });
    });
  });
});
