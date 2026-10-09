import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { describe, it } from "node:test";

import { runTogether } from "./runTogether.ts";

describe("runTogether", () => {
  it("interrupts an already running child when a command exits", async () => {
    const running = spawn(process.execPath, [
      "-e",
      "setTimeout(() => {}, 60000)",
    ]);
    runTogether(
      [{ command: process.execPath, args: ["-e", ""], env: {} }],
      process.cwd(),
      [running],
    );
    const [, signal] = await once(running, "exit");
    assert.equal(signal, "SIGINT");
  });
});
