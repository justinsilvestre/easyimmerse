import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "./Button.tsx";

afterEach(cleanup);

describe("Button", () => {
  it("drops its hover background while marked unavailable", () => {
    render(
      <Button variant="primary" aria-disabled>
        Save
      </Button>,
    );
    expect(screen.getByRole("button").className).not.toMatch(/hover:bg/);
  });

  it("looks unavailable while marked unavailable", () => {
    render(<Button aria-disabled>Save</Button>);
    expect(screen.getByRole("button").className).toMatch(
      /aria-disabled:opacity-50/,
    );
  });
});
