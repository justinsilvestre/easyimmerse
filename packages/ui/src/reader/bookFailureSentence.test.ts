import { describe, expect, it } from "vitest";
import { bookFailureSentence } from "./bookFailureSentence.ts";

describe("bookFailureSentence", () => {
  it("explains a browser file on a platform that holds none", () => {
    expect(
      bookFailureSentence({
        status: 404,
        code: "browserFileUnreachable",
        message: "",
      }),
    ).toBe(
      "This file was added in a web browser, and this app cannot reach it.",
    );
  });

  it("explains a browser file that is no longer open", () => {
    expect(
      bookFailureSentence({
        status: 404,
        code: "browserFileGone",
        message: "",
      }),
    ).toBe(
      "This file is no longer open in the browser. Add it again to read it.",
    );
  });

  it("explains a file the server cannot find", () => {
    expect(
      bookFailureSentence({
        status: 404,
        message: "no file at the given path",
      }),
    ).toBe("The file was not found. It may have been moved or deleted.");
  });

  it("explains a file that is not a readable book", () => {
    expect(
      bookFailureSentence({ status: 400, message: "invalid zip archive" }),
    ).toBe("The file could not be read as an ebook or a text file.");
  });

  it("explains a server that cannot be reached", () => {
    expect(
      bookFailureSentence({ status: "NETWORK", message: "Failed to fetch" }),
    ).toBe("The easyImmerse server could not be reached.");
  });

  it("explains a path that only the server can read when there is no server", () => {
    expect(
      bookFailureSentence({ status: "OFFLINE", message: "no server" }),
    ).toBe(
      "This file lies on a computer's disk, and only the easyImmerse server can read it.",
    );
  });

  it("passes on the message of another server failure", () => {
    expect(bookFailureSentence({ status: 500, message: "disk full" })).toBe(
      "disk full",
    );
  });

  it("falls back to a general sentence for anything else", () => {
    expect(bookFailureSentence(new Error("boom"))).toBe(
      "The file could not be read.",
    );
  });
});
