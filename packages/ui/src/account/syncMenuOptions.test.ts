import { actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { syncMenuOptions } from "./syncMenuOptions.ts";

const labelsOf = (options: ReturnType<typeof syncMenuOptions>) =>
  options.map(({ label }) => label);

const paired = (usesAccounts: boolean) =>
  ({
    kind: "pairedDesktop",
    serverUrl: "http://192.168.1.20:4000",
    host: "192.168.1.20:4000",
    deviceName: null,
    usesAccounts,
  }) as const;

describe("syncMenuOptions", () => {
  it("offers to log in and to let other devices connect on the desktop", () => {
    expect(
      labelsOf(syncMenuOptions({ kind: "thisDevice", device: "computer" })),
    ).toEqual(["Log in or sign up", "Let other devices connect"]);
  });

  it("offers to log in and to pair with the desktop app elsewhere", () => {
    expect(
      labelsOf(syncMenuOptions({ kind: "thisDevice", device: "browser" })),
    ).toEqual(["Log in or sign up", "Pair with your desktop app"]);
  });

  it("opens the local network sync page to pair", () => {
    expect(
      syncMenuOptions({ kind: "thisDevice", device: "mobile" })[1]?.actions,
    ).toEqual([actions.navigated({ type: "openPairing" })]);
  });

  it("offers to log in to a paired desktop app whose server has accounts", () => {
    expect(labelsOf(syncMenuOptions(paired(true)))).toEqual(["Log in"]);
  });

  it("fills in the paired desktop app's address to log in", () => {
    expect(syncMenuOptions(paired(true))[0]?.actions[0]).toEqual(
      actions.signInFormChanged({
        serverChoice: "own",
        ownServerUrl: "http://192.168.1.20:4000",
      }),
    );
  });

  it("offers nothing on a paired desktop app without accounts", () => {
    expect(syncMenuOptions(paired(false))).toEqual([]);
  });

  it("offers nothing while the work is on a server", () => {
    expect(
      syncMenuOptions({
        kind: "server",
        serverName: "the easyImmerse cloud",
        lastBackedUpMs: null,
      }),
    ).toEqual([]);
  });
});
