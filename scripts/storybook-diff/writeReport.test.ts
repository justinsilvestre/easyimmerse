import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { embedJson } from "./writeReport.ts";

describe("embedJson", () => {
  it("escapes a closing tag inside a string", () => {
    assert.equal(embedJson({ error: "</script>" }), '{"error":"<\\/script>"}');
  });
});
