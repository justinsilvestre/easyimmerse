import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { gnuLicenseUrls, planNotices } from "./noticePlan.ts";
import { renderNotices, renderNoticesText } from "./notices.ts";

const macUrl =
  "https://github.com/octo/repo/releases/download/ffmpeg-macos-8.1.2/ffmpeg-8.1.2-aarch64-apple-darwin.tar.xz";

function planFor(configuration: string) {
  return planNotices({
    "aarch64-apple-darwin": { url: macUrl, sha256: "abc", configuration },
  });
}

const gnuTexts = {
  [gnuLicenseUrls.lgpl21]: "LGPL 2.1 text",
  [gnuLicenseUrls.lgpl3]: "LGPL 3 text",
  [gnuLicenseUrls.gpl3]: "GPL 3 text",
};

describe("renderNotices", () => {
  it("adds the LGPL 3.0 and GPL 3.0 texts for a version3 build", () => {
    const titles = renderNotices(planFor("--enable-version3"), gnuTexts).map(
      (n) => n.title,
    );
    assert.deepEqual(titles.slice(1), [
      "GNU Lesser General Public License v2.1",
      "GNU Lesser General Public License v3.0",
      "GNU General Public License v3.0",
    ]);
  });

  it("gives only the LGPL 2.1 text for a build without version3", () => {
    const titles = renderNotices(planFor("--prefix=/p"), gnuTexts).map(
      (n) => n.title,
    );
    assert.deepEqual(titles.slice(1), [
      "GNU Lesser General Public License v2.1",
    ]);
  });

  it("renders nothing for a rejected build", () => {
    assert.deepEqual(renderNotices(planFor("--enable-libzmq"), gnuTexts), []);
  });
});

describe("renderNoticesText", () => {
  it("underlines each title", () => {
    assert.equal(
      renderNoticesText([{ title: "Ab", text: "c" }]),
      "Ab\n==\n\nc\n",
    );
  });
});
