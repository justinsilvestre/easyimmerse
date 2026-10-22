import { actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { openMailedLink } from "./openMailedLink.ts";

/** A page at the address, whose address changes and dispatched actions are recorded. */
function pageAt(address: string) {
  const url = new URL(address);
  const replacedWith: string[] = [];
  const dispatched: unknown[] = [];
  const page = {
    location: url as unknown as Location,
    history: {
      state: null,
      replaceState: (_state: unknown, _unused: string, next?: string | URL) =>
        replacedWith.push(String(next)),
    } as unknown as History,
  };
  const store = { dispatch: (action: unknown) => dispatched.push(action) };
  return { page, store, replacedWith, dispatched };
}

describe("openMailedLink", () => {
  it("removes the link's parameter from the address bar", () => {
    const { page, store, replacedWith } = pageAt(
      "https://app.example.com/app/?confirm_email=abc#top",
    );
    openMailedLink(store, page);
    expect(replacedWith).toEqual(["/app/#top"]);
  });

  it("hands the link to the store", () => {
    const { page, store, dispatched } = pageAt(
      "https://app.example.com/?reset_password=abc",
    );
    openMailedLink(store, page);
    expect(dispatched).toEqual([
      actions.mailedLinkOpened({ kind: "resetPassword", token: "abc" }),
    ]);
  });

  it("leaves an address without a link as it is", () => {
    const { page, store, replacedWith } = pageAt(
      "https://app.example.com/?other=1",
    );
    openMailedLink(store, page);
    expect(replacedWith).toEqual([]);
  });
});
