import { describe, expect, it } from "vitest";
import { saveDialogOptions, savePathPickOf } from "./pickSavePath.ts";

describe("saveDialogOptions", () => {
  it("suggests the file name", () => {
    expect(saveDialogOptions("Korean.apkg").defaultPath).toBe("Korean.apkg");
  });

  it("offers only files of the suggested name's extension", () => {
    expect(saveDialogOptions("Korean.apkg").filters).toEqual([
      { name: "APKG file", extensions: ["apkg"] },
    ]);
  });

  it("offers every file for a name without an extension", () => {
    expect(saveDialogOptions("Korean").filters).toBeUndefined();
  });
});

describe("savePathPickOf", () => {
  it("is the chosen path", () => {
    expect(savePathPickOf("/decks/Korean.apkg")).toEqual({
      kind: "path",
      path: "/decks/Korean.apkg",
    });
  });

  it("is cancelled when the user closed the dialog", () => {
    expect(savePathPickOf(null)).toEqual({ kind: "cancelled" });
  });
});
