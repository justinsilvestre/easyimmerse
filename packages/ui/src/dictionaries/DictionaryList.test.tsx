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
