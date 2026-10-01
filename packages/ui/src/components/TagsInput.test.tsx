import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TagsInput } from "./TagsInput.tsx";

afterEach(cleanup);

function renderTagsInput(tags: string[]) {
  const changes: string[][] = [];
  render(
    <TagsInput
      label="Default tags"
      tags={tags}
      onChange={(next) => changes.push(next)}
    />,
  );
  return changes;
}

const findInput = () => screen.getByRole("textbox", { name: "Default tags" });

function typeTag(text: string) {
  fireEvent.change(findInput(), { target: { value: text } });
  fireEvent.keyDown(findInput(), { key: "Enter" });
}

describe("TagsInput", () => {
  it("adds the typed tag on Enter", () => {
    const changes = renderTagsInput(["dark"]);
    typeTag("season_1");
    expect(changes).toEqual([["dark", "season_1"]]);
  });

  it("adds the typed tag when a comma is typed", () => {
    const changes = renderTagsInput([]);
    fireEvent.change(findInput(), { target: { value: "dark," } });
    expect(changes).toEqual([["dark"]]);
  });

  it("adds every tag in pasted comma-separated text", () => {
    const changes = renderTagsInput([]);
    fireEvent.change(findInput(), { target: { value: "dark, mystery," } });
    expect(changes).toEqual([["dark", "mystery"]]);
  });

  it("keeps the text after the last comma in the input", () => {
    renderTagsInput([]);
    fireEvent.change(findInput(), { target: { value: "dark,myst" } });
    expect(findInput()).toHaveProperty("value", "myst");
  });

  it("clears the input after adding a tag", () => {
    renderTagsInput([]);
    typeTag("dark");
    expect(findInput()).toHaveProperty("value", "");
  });

  it("trims whitespace around the tag", () => {
    const changes = renderTagsInput([]);
    typeTag("  dark  ");
    expect(changes).toEqual([["dark"]]);
  });

  it("replaces inner whitespace with underscores, as Anki splits tags on spaces", () => {
    const changes = renderTagsInput([]);
    typeTag("german  tv");
    expect(changes).toEqual([["german_tv"]]);
  });

  it("ignores a tag that is already present", () => {
    const changes = renderTagsInput(["dark"]);
    typeTag("dark");
    expect(changes).toEqual([]);
  });

  it("ignores blank text", () => {
    const changes = renderTagsInput([]);
    typeTag("   ");
    expect(changes).toEqual([]);
  });

  it("adds the typed tag when the input loses focus", () => {
    const changes = renderTagsInput([]);
    fireEvent.change(findInput(), { target: { value: "dark" } });
    fireEvent.blur(findInput());
    expect(changes).toEqual([["dark"]]);
  });

  it("removes a tag when its remove button is clicked", () => {
    const changes = renderTagsInput(["dark", "season_1"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove dark" }));
    expect(changes).toEqual([["season_1"]]);
  });

  it("lists the current tags", () => {
    renderTagsInput(["dark", "season_1"]);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
