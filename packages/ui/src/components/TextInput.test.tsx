import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TextInput } from "./TextInput.tsx";

afterEach(cleanup);

describe("TextInput", () => {
  it("reports the typed value", () => {
    const values: string[] = [];
    render(
      <TextInput
        label="Project name"
        value=""
        onChange={(value) => values.push(value)}
      />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Project name" }), {
      target: { value: "Dark" },
    });
    expect(values).toEqual(["Dark"]);
  });

  it("describes the input with its hint", () => {
    render(
      <TextInput
        label="Language code"
        value=""
        hint="A BCP 47 tag."
        onChange={() => {}}
      />,
    );
    expect(
      screen.queryByRole("textbox", { description: "A BCP 47 tag." }),
    ).not.toBeNull();
  });
});
