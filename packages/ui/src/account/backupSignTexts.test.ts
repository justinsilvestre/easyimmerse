import { describe, expect, it } from "vitest";
import { backupSignTexts } from "./backupSignTexts.ts";

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
    expect(backupSignTexts({ kind: "browserOnly" })?.offersLogIn).toBe(true);
  });

  it("explains that failed saves are kept in this browser until they're saved", () => {
    expect(backupSignTexts({ kind: "failedSaves" })?.explanation).toBe(
      "Some flashcards couldn't be saved to your server yet. They're kept in this browser until they're saved, so you'll lose them if its data is cleared.",
    );
  });

  it("offers no way to log in for failed saves", () => {
    expect(backupSignTexts({ kind: "failedSaves" })?.offersLogIn).toBe(false);
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
    expect(backupSignTexts(deviceOnly("mobile"))?.offersLogIn).toBe(true);
  });
});
