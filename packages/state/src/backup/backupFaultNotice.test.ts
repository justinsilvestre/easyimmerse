import { describe, expect, it } from "vitest";
import { backupFaultNotice, isBackupFault } from "./backupFaultNotice.ts";
import type { BackupSign } from "./selectBackupSign.ts";

const hidden: BackupSign = { kind: "hidden" };

const deviceOnly: BackupSign = {
  kind: "deviceOnly",
  platform: "desktop",
  hasOfficialServer: true,
};

const unreachable: BackupSign = {
  kind: "linkUnreachable",
  platform: "desktop",
  serverUrl: "https://cloud.example.org",
  serverName: "the easyImmerse cloud",
  sinceMs: 0,
};

const loggedOut: BackupSign = {
  kind: "loggedOut",
  platform: "desktop",
  serverUrl: "https://cloud.example.org",
  serverName: "cloud.example.org",
  email: "someone@example.org",
};

describe("isBackupFault", () => {
  it("counts work never set up to be backed up as no fault", () => {
    expect(isBackupFault(deviceOnly)).toBe(false);
  });

  it("counts failed saves as a fault", () => {
    expect(isBackupFault({ kind: "failedSaves" })).toBe(true);
  });
});

describe("backupFaultNotice", () => {
  it("tells of a remote that could not be reached once the backup breaks", () => {
    expect(backupFaultNotice(hidden, unreachable)?.message).toBe(
      "Couldn't reach the easyImmerse cloud, so your latest work hasn't been backed up there yet.",
    );
  });

  it("tells of a log-out once the backup breaks after work was kept only on the device", () => {
    expect(backupFaultNotice(deviceOnly, loggedOut)?.message).toBe(
      "You were logged out of cloud.example.org, so your latest work hasn't been backed up there.",
    );
  });

  it("goes by itself", () => {
    expect(backupFaultNotice(hidden, unreachable)?.isTransient).toBe(true);
  });

  it("shows none while the backup stays broken", () => {
    expect(backupFaultNotice(unreachable, loggedOut)).toBeNull();
  });

  it("shows none while nothing is broken", () => {
    expect(backupFaultNotice(hidden, deviceOnly)).toBeNull();
  });
});
