import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FlashcardTagsEditor } from "./FlashcardTagsEditor.tsx";

afterEach(cleanup);

function renderTagsEditor(tags: readonly string[]) {
  const changes: (readonly string[])[] = [];
  render(
    <FlashcardTagsEditor tags={tags} onChange={(next) => changes.push(next)} />,
  );
  return changes;
}

const findInput = () => screen.getByRole("textbox", { name: "Tags" });

function typeTag(text: string, key: string) {
  fireEvent.change(findInput(), { target: { value: text } });
  fireEvent.keyDown(findInput(), { key });
}

describe("FlashcardTagsEditor", () => {
  it("shows each tag", () => {
    renderTagsEditor(["noun", "dark"]);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("adds the typed tag on Enter, without surrounding spaces", () => {
    const changes = renderTagsEditor(["noun"]);
    typeTag(" verb ", "Enter");
    expect(changes).toEqual([["noun", "verb"]]);
  });

  it("adds the typed tag on a comma", () => {
    const changes = renderTagsEditor([]);
    typeTag("verb", ",");
    expect(changes).toEqual([["verb"]]);
  });

  it("adds the typed tag when the input loses focus", () => {
    const changes = renderTagsEditor([]);
    fireEvent.change(findInput(), { target: { value: "verb" } });
    fireEvent.blur(findInput());
    expect(changes).toEqual([["verb"]]);
  });

  it("ignores a tag the card already has", () => {
    const changes = renderTagsEditor(["noun"]);
    typeTag("noun", "Enter");
    expect(changes).toEqual([]);
  });

  it("clears the input after adding a tag", () => {
    renderTagsEditor([]);
    typeTag("verb", "Enter");
    expect(findInput()).toHaveProperty("value", "");
  });

  it("removes a tag with its remove button", () => {
    const changes = renderTagsEditor(["noun", "dark"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove tag noun" }));
    expect(changes).toEqual([["dark"]]);
  });
});
