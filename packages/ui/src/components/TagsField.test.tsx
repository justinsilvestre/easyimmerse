import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TagsField } from "./TagsField.tsx";

afterEach(cleanup);

function renderField(
  tags: readonly string[],
  onChange: (tags: readonly string[]) => void = () => undefined,
) {
  render(<TagsField label="Tags" tags={tags} onChange={onChange} />);
}

const findInput = () => screen.getByLabelText("Tags") as HTMLInputElement;

describe("TagsField", () => {
  it("turns the text before a typed comma into a tag", () => {
    const changes: (readonly string[])[] = [];
    renderField(["tv"], (tags) => changes.push(tags));
    fireEvent.change(findInput(), { target: { value: "dark," } });
    expect(changes).toEqual([["tv", "dark"]]);
  });

  it("keeps the text after the comma in the field", () => {
    renderField([]);
    fireEvent.change(findInput(), { target: { value: "dark, ep" } });
    expect(findInput().value).toBe("ep");
  });

  it("turns the typed text into a tag on Enter", () => {
    const changes: (readonly string[])[] = [];
    renderField([], (tags) => changes.push(tags));
    fireEvent.change(findInput(), { target: { value: "dark" } });
    fireEvent.keyDown(findInput(), { key: "Enter" });
    expect(changes).toEqual([["dark"]]);
  });

  it("takes the last tag back on Backspace in the empty field", () => {
    const changes: (readonly string[])[] = [];
    renderField(["tv", "dark"], (tags) => changes.push(tags));
    fireEvent.keyDown(findInput(), { key: "Backspace" });
    expect(changes).toEqual([["tv"]]);
  });

  it("removes a tag with its button", () => {
    const changes: (readonly string[])[] = [];
    renderField(["tv", "dark"], (tags) => changes.push(tags));
    fireEvent.click(screen.getByRole("button", { name: "Remove the tag tv" }));
    expect(changes).toEqual([["dark"]]);
  });
});
