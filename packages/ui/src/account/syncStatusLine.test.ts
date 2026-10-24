import type { BackupSign, SyncPlace } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { syncStatusLine } from "./syncStatusLine.ts";

const now = new Date(2026, 9, 22, 15, 30).getTime();

const hidden: BackupSign = { kind: "hidden" };

const cloud: SyncPlace = {
  kind: "server",
  serverName: "the easyImmerse cloud",
  lastBackedUpMs: null,
};

const paired: SyncPlace = {
  kind: "pairedDesktop",
  serverUrl: "http://192.168.1.20:4000",
  host: "192.168.1.20:4000",
  deviceName: null,
  usesAccounts: false,
};

describe("syncStatusLine", () => {
  it("tells of work saved only on this computer", () => {
    expect(
      syncStatusLine({ kind: "thisDevice", device: "computer" }, hidden),
    ).toBe("Saved only on this computer");
  });

  it("tells of work saved only in this browser", () => {
    expect(
      syncStatusLine({ kind: "thisDevice", device: "browser" }, hidden),
    ).toBe("Saved only in this browser");
  });

  it("tells when the work was last backed up to the server", () => {
    expect(
      syncStatusLine({ ...cloud, lastBackedUpMs: now - 120_000 }, hidden, now),
    ).toBe("Backed up to the easyImmerse cloud 2 minutes ago");
  });

  it("tells of the server alone while it gives no time of the last backup", () => {
    expect(syncStatusLine(cloud, hidden)).toBe(
      "Backed up to the easyImmerse cloud",
    );
  });

  it("names the paired desktop app by its computer's name", () => {
    expect(
      syncStatusLine({ ...paired, deviceName: "Studio iMac" }, hidden),
    ).toBe("Paired with Studio iMac");
  });

  it("names the paired desktop app by its address when its computer has no name", () => {
    expect(syncStatusLine(paired, hidden)).toBe(
      "Paired with the desktop app at 192.168.1.20:4000",
    );
  });

  it("tells of a server that cannot be reached in place of the place", () => {
    expect(
      syncStatusLine(cloud, {
        kind: "linkUnreachable",
        platform: "desktop",
        serverUrl: "https://cloud.example.org",
        serverName: "the easyImmerse cloud",
        sinceMs: 0,
      }),
    ).toBe("Couldn't reach the easyImmerse cloud");
  });

  it("tells of failed saves", () => {
    expect(syncStatusLine(cloud, { kind: "failedSaves" })).toBe(
      "Some flashcards haven't been saved yet",
    );
  });
});
