import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageSelect } from "./LanguageSelect.tsx";

afterEach(cleanup);

function renderLanguageSelect(value: string) {
  const values: string[] = [];
  render(
    <LanguageSelect
      label="Target language"
      value={value}
      onChange={(next) => values.push(next)}
    />,
  );
  return values;
}

const findSelect = () =>
  screen.getByRole("combobox", { name: "Target language" });
const queryTagInput = () =>
  screen.queryByRole("textbox", { name: "Target language code" });

describe("LanguageSelect", () => {
  it("reports the code of the chosen language", () => {
    const values = renderLanguageSelect("");
    fireEvent.change(findSelect(), { target: { value: "ja" } });
    expect(values).toEqual(["ja"]);
  });

  it("labels each language with its native and English names", () => {
    renderLanguageSelect("");
    expect(
      screen.queryByRole("option", { name: "Deutsch (German)" }),
    ).not.toBeNull();
  });

  it("hides the code input for a listed language", () => {
    renderLanguageSelect("de");
    expect(queryTagInput()).toBeNull();
  });

  it("shows the code input for a language missing from the list", () => {
    renderLanguageSelect("gsw");
    expect(queryTagInput()).not.toBeNull();
  });

  it("reveals the code input when Other is chosen", () => {
    renderLanguageSelect("de");
    fireEvent.change(findSelect(), { target: { value: "other" } });
    expect(queryTagInput()).not.toBeNull();
  });

  it("reports the typed code", () => {
    const values = renderLanguageSelect("gsw");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "yue" } });
    expect(values).toEqual(["yue"]);
  });
});
