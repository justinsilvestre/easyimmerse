import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";

import { runTogether } from "./runTogether.ts";

const exitAtOnce = { command: process.execPath, args: ["-e", ""], env: {} };

function spawnLongRunning() {
  return spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"]);
}

describe("runTogether", () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it("interrupts an already running child when a command exits", async () => {
    const running = spawnLongRunning();
    await runTogether([exitAtOnce], process.cwd(), [running]);
    assert.equal(running.signalCode, "SIGINT");
  });

  it("stops listening for signals once every child has exited", async () => {
    const listenersBefore = process.listenerCount("SIGINT");
    await runTogether([exitAtOnce], process.cwd());
    assert.equal(process.listenerCount("SIGINT"), listenersBefore);
  });
});
