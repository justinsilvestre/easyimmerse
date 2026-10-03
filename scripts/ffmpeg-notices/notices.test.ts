import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Library } from "./libraries.ts";
import { gnuLicenseUrls, planNotices } from "./noticePlan.ts";
import {
  renderBuildNotice,
  renderLibraryNotice,
  renderNotices,
  renderNoticesText,
} from "./notices.ts";

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

describe("renderLibraryNotice", () => {
  const library: Library = { name: "zlib", license: "Zlib", licenseUrl: "u" };

  it("quotes the license text after the platforms that link it", () => {
    const notice = renderLibraryNotice(library, ["Linux (x86-64)"], {
      u: "zlib text\n",
    });
    assert.equal(
      notice.text,
      "zlib is statically linked into FFmpeg for Linux (x86-64).\nLicense: Zlib\nLicense text: u\n\nzlib text",
    );
  });

  it("keeps only the license lines of a source file", () => {
    const header = { ...library, licenseLineCount: 1 };
    const notice = renderLibraryNotice(header, [], { u: "notice\ncode" });
    assert.match(notice.text, /\nnotice$/);
  });

  it("throws when the license text was never fetched", () => {
    assert.throws(() => renderLibraryNotice(library, [], {}));
  });
});

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
