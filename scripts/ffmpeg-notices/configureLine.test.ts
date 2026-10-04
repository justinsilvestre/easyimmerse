import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findConfigureLine,
  listEnabledFeatures,
  parseConfigureLine,
} from "./configureLine.ts";

function binaryWith(...strings: string[]): Uint8Array {
  return Buffer.from(`\x7fELF\0${strings.join("\0\x01")}\0`, "latin1");
}

describe("findConfigureLine", () => {
  describe("when the binary embeds the configuration marker", () => {
    it("returns the arguments after the marker", () => {
      const binary = binaryWith("%sconfiguration: --disable-gpl --cc=clang");
      assert.equal(findConfigureLine(binary), "--disable-gpl --cc=clang");
    });

    it("prefers it to a longer configure line of a linked library", () => {
      const binary = binaryWith(
        "--prefix=/ffbuild --enable-static --disable-shared",
        "%sconfiguration: --prefix=/p",
      );
      assert.equal(findConfigureLine(binary), "--prefix=/p");
    });
  });

  describe("when the binary lacks the configuration marker", () => {
    it("returns the printable string around --prefix=", () => {
      const binary = binaryWith("--prefix=/p --enable-version3");
      assert.equal(findConfigureLine(binary), "--prefix=/p --enable-version3");
    });

    it("drops text before the first option", () => {
      const binary = binaryWith("%s --disable-gpl --prefix=/p");
      assert.equal(findConfigureLine(binary), "--disable-gpl --prefix=/p");
    });

    it("prefers the longest of several configure lines", () => {
      const binary = binaryWith(
        "--prefix=/ffbuild --enable-zlib --enable-libvpx",
        "--disable-shared --prefix=/opt",
      );
      assert.equal(
        findConfigureLine(binary),
        "--prefix=/ffbuild --enable-zlib --enable-libvpx",
      );
    });
  });

  it("returns null when the binary has no configure line", () => {
    assert.equal(findConfigureLine(binaryWith("hello")), null);
  });
});

describe("parseConfigureLine", () => {
  it("splits on whitespace", () => {
    assert.deepEqual(parseConfigureLine("--a  --b=c"), ["--a", "--b=c"]);
  });

  it("keeps quoted values together without their quotes", () => {
    assert.deepEqual(parseConfigureLine("--cc='clang -arch x86_64' --x"), [
      "--cc=clang -arch x86_64",
      "--x",
    ]);
  });
});

describe("listEnabledFeatures", () => {
  it("lists enabled features by name", () => {
    const features = listEnabledFeatures(["--enable-zlib", "--enable-libvpx"]);
    assert.deepEqual(features, ["libvpx", "zlib"]);
  });

  it("drops a feature disabled after it was enabled", () => {
    const features = listEnabledFeatures(["--enable-xlib", "--disable-xlib"]);
    assert.deepEqual(features, []);
  });

  it("ignores options that only disable", () => {
    assert.deepEqual(listEnabledFeatures(["--disable-libx264"]), []);
  });

  it("names libraries passed through --extra-libs", () => {
    const features = listEnabledFeatures(["--extra-libs=-lgomp -ldl"]);
    assert.deepEqual(features, ["lib:dl", "lib:gomp"]);
  });

  it("names the target operating system", () => {
    const features = listEnabledFeatures(["--target-os=mingw32"]);
    assert.deepEqual(features, ["target-os:mingw32"]);
  });
});
