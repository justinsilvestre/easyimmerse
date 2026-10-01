import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CheckboxField } from "./CheckboxField.tsx";

afterEach(cleanup);

describe("CheckboxField", () => {
  it("reports the new checked state when clicked", () => {
    const states: boolean[] = [];
    render(
      <CheckboxField
        label="Use text-to-speech"
        checked={false}
        onChange={(checked) => states.push(checked)}
      />,
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Use text-to-speech" }),
    );
    expect(states).toEqual([true]);
  });
});
