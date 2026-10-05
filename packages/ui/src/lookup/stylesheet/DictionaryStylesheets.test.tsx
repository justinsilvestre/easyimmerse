import { readFixtureText } from "@easyimmerse/fixtures";
import type { DictionaryStylesheet } from "@easyimmerse/types";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DictionaryPopup } from "../DictionaryPopup.tsx";
import {
  exampleStyledMDictResult,
  exampleStyledYomitanResult,
} from "../exampleStyledLookup.ts";
import { DictionaryStylesheets } from "./DictionaryStylesheets.tsx";

afterEach(cleanup);

/** The fixtures' stylesheets, read from disk because the test environment empties imported CSS. */
function fixtureStylesheets(): DictionaryStylesheet[] {
  return [
    {
      dictionaryId: "sample-yomitan",
      css: readFixtureText("sample-yomitan/styles.css"),
    },
    {
      dictionaryId: "sample-mdict",
      css: readFixtureText("sample-mdict/sample.css"),
    },
  ];
}

function renderStyledPopup() {
  return render(
    <DictionaryPopup
      state={{
        kind: "found",
        term: "cat",
        results: [exampleStyledYomitanResult, exampleStyledMDictResult],
        stylesheets: fixtureStylesheets(),
      }}
      mode="hover"
      resolveMediaUrl={() => null}
      onSearch={() => undefined}
      onCreateFlashcard={() => undefined}
      onClose={() => undefined}
      onSetUpDictionary={() => undefined}
    />,
  );
}

/** Returns the selector of the first rule in the page's style elements whose text contains `fragment`. */
function selectorContaining(container: HTMLElement, fragment: string): string {
  const rules = [...container.querySelectorAll("style")].flatMap((style) =>
    (style.textContent ?? "").split("\n"),
  );
  const rule = rules.find((line) => line.includes(fragment)) ?? "";
  return rule.slice(0, rule.indexOf(" {"));
}

describe("DictionaryStylesheets", () => {
  it("renders one style element for each dictionary", () => {
    const { container } = render(
      <DictionaryStylesheets
        stylesheets={[...fixtureStylesheets(), ...fixtureStylesheets()]}
        resolveMediaUrl={() => null}
      />,
    );
    expect(container.querySelectorAll("style")).toHaveLength(2);
  });

  it("styles an MDict entry through the classes its markup carries", () => {
    const { container } = renderStyledPopup();
    const selector = selectorContaining(container, ".dict-headword {");
    expect(container.querySelector(selector)?.textContent).toBe("cat");
  });

  it("styles a Yomitan entry through the data attributes of its structured content", () => {
    const { container } = renderStyledPopup();
    const selector = selectorContaining(container, "data-sc-content");
    expect(container.querySelector(selector)?.tagName).toBe("UL");
  });

  it("does not style one dictionary's entries with another's stylesheet", () => {
    const { container } = renderStyledPopup();
    const selector = selectorContaining(container, "data-sc-content");
    const mdictScope = container.querySelector(
      '[data-dictionary-scope="sample-mdict"]',
    );
    expect(mdictScope?.querySelector(selector)).toBeNull();
  });
});
