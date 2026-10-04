import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderBuildNotice } from "./buildNotice.ts";
import { planNotices } from "./noticePlan.ts";

const macUrl =
  "https://github.com/octo/repo/releases/download/ffmpeg-macos-8.1.2/ffmpeg-8.1.2-aarch64-apple-darwin.tar.xz";

function planFor(configuration: string) {
  return planNotices({
    "aarch64-apple-darwin": { url: macUrl, sha256: "abc", configuration },
  });
}

describe("renderBuildNotice", () => {
  const [accepted] = planFor("--enable-version3 --prefix=/p").acceptedBuilds;

  it("titles the notice with the version and platform", () => {
    assert.equal(
      accepted && renderBuildNotice(accepted).title,
      "FFmpeg 8.1.2 for macOS (Apple silicon)",
    );
  });

  it("lists the configure flags one per line", () => {
    assert.match(
      accepted ? renderBuildNotice(accepted).text : "",
      /\n--enable-version3\n--prefix=\/p$/,
    );
  });

  it("quotes a configure flag that contains spaces", () => {
    const [quoted] = planFor("--cc='clang -arch x86_64'").acceptedBuilds;
    assert.match(
      quoted ? renderBuildNotice(quoted).text : "",
      /\n--cc='clang -arch x86_64'$/,
    );
  });

  it("names the LGPL version 3 for a version3 build", () => {
    assert.match(
      accepted ? renderBuildNotice(accepted).text : "",
      /LGPL version 3 or later/,
    );
  });
});
