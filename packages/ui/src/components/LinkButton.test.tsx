import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LinkButton } from "./LinkButton.tsx";

afterEach(cleanup);

describe("LinkButton", () => {
  it("is a button named by its text", () => {
    render(<LinkButton>Show the setup steps</LinkButton>);
    expect(
      screen.getByRole("button", { name: "Show the setup steps" }),
    ).toBeDefined();
  });

  it("does not submit a form it sits in", () => {
    render(<LinkButton>Show the setup steps</LinkButton>);
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
  });

  it("calls its handler when clicked", () => {
    const clicks: string[] = [];
    render(
      <LinkButton onClick={() => clicks.push("clicked")}>
        Show the setup steps
      </LinkButton>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(clicks).toEqual(["clicked"]);
  });
});
