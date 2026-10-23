import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleResults } from "../lookup/exampleLookup.ts";
import type { PageLookupView } from "./createPageLookup.ts";
import { PageLookupPopup } from "./PageLookupPopup.tsx";

afterEach(cleanup);

const foundView: PageLookupView = {
  anchor: { top: 10, bottom: 20, left: 10, right: 50 },
  term: "fressen",
  query: { text: "fressen", language: "de" },
  outcome: {
    kind: "answered",
    response: { results: [...exampleResults], kanji: [], stylesheets: [] },
  },
  size: "compact",
};

function renderPopup(view: PageLookupView | null) {
  render(
    <PageLookupPopup
      view={view}
      resolveMedia={() => null}
      onSearch={() => undefined}
      onToggleSize={() => undefined}
      onClose={() => undefined}
    />,
  );
}

describe("PageLookupPopup", () => {
  it("shows the dictionaries' entries for the word", () => {
    renderPopup(foundView);
    expect(
      screen.getByRole("region", { name: "DWDS Kernwortschatz" }),
    ).toBeTruthy();
  });

  it("offers no flashcard", () => {
    renderPopup(foundView);
    expect(screen.queryByRole("button", { name: /flashcard/i })).toBeNull();
  });

  it("offers no way to the dictionaries when no entry is found", () => {
    renderPopup({
      ...foundView,
      outcome: {
        kind: "answered",
        response: { results: [], kanji: [], stylesheets: [] },
      },
    });
    expect(
      screen.queryByRole("button", { name: "Check your dictionaries" }),
    ).toBeNull();
  });

  it("shows nothing without a view", () => {
    renderPopup(null);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
