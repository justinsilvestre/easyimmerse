import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { standaloneServerCargoArgs } from "./standaloneServer.ts";

describe("standaloneServerCargoArgs", () => {
  it("serves the desktop app's database and cache on port 8789", () => {
    const args = standaloneServerCargoArgs({
      databasePath: "/data/a b.sqlite",
      cacheDir: "/cache",
    });
    assert.deepEqual(args, [
      ...["run", "--quiet", "-p", "easyimmerse-server", "--", "serve"],
      ...["--bind", "127.0.0.1:8789", "--db", "/data/a b.sqlite"],
      ...[
        "--cache-dir",
        "/cache",
        "--allow-local-paths",
        "--seed-placeholders",
        "--seed-sample-content",
      ],
    ]);
  });
});
