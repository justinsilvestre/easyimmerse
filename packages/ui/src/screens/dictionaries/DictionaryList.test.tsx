import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DictionaryList } from "./DictionaryList.tsx";
import { exampleDictionaries } from "./exampleDictionaries.ts";

afterEach(cleanup);

const [german] = exampleDictionaries;

describe("DictionaryList", () => {
  it("groups dictionaries whose language tags differ only in script or region", () => {
    if (german === undefined) throw new Error("No example dictionary");
    render(
      <DictionaryList
        dictionaries={[
          { ...german, id: "a", source_language: "zh-Hans" },
          { ...german, id: "b", source_language: "zh" },
        ]}
        onRemove={() => undefined}
      />,
    );
    expect(screen.getAllByRole("region")).toHaveLength(1);
  });
});

describe("DictionaryList with a dictionary being removed", () => {
  function renderRemoving() {
    render(
      <DictionaryList
        dictionaries={exampleDictionaries}
        removingIds={["d1"]}
        onMove={() => undefined}
        onRemove={() => undefined}
      />,
    );
  }

  const isDisabled = (name: string) =>
    screen.getByRole("button", { name }).hasAttribute("disabled");

  it("says the dictionary is being removed", () => {
    renderRemoving();
    expect(screen.getByRole("status").textContent).toBe("Removing…");
  });

  it("disables its remove button", () => {
    renderRemoving();
    expect(isDisabled("Remove German-English Wiktionary")).toBe(true);
  });

  it("disables its move button", () => {
    renderRemoving();
    expect(isDisabled("Move German-English Wiktionary down")).toBe(true);
  });

  it("leaves the other dictionaries' remove buttons enabled", () => {
    renderRemoving();
    expect(isDisabled("Remove DWDS Kernwortschatz")).toBe(false);
  });
});
