import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { gnuLicenseUrls, listLicenseUrls, planNotices } from "./noticePlan.ts";

const url =
  "https://github.com/octo/repo/releases/download/ffmpeg-macos-8.1.2/ffmpeg-8.1.2-x86_64-apple-darwin.tar.xz";

describe("planNotices", () => {
  it("rejects a build that links a disallowed library", () => {
    const plan = planNotices({
      t: { url, sha256: "", configuration: "--enable-libsrt" },
    });
    assert.deepEqual(Object.keys(plan.rejections), ["t"]);
  });

  it("accepts a build without third-party libraries", () => {
    const plan = planNotices({
      t: { url, sha256: "", configuration: "--disable-gpl" },
    });
    assert.equal(plan.acceptedBuilds.length, 1);
  });
});

describe("listLicenseUrls", () => {
  it("lists the GNU texts and each linked library's text", () => {
    const plan = planNotices({
      t: { url, sha256: "", configuration: "--enable-version3 --enable-zlib" },
    });
    assert.deepEqual(listLicenseUrls(plan), [
      gnuLicenseUrls.gpl3,
      gnuLicenseUrls.lgpl21,
      gnuLicenseUrls.lgpl3,
      "https://raw.githubusercontent.com/madler/zlib/master/LICENSE",
    ]);
  });
});
