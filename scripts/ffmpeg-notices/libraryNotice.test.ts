import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Library } from "./libraries.ts";
import { renderLibraryNotice } from "./libraryNotice.ts";

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
