import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LicensesPage } from "./LicensesPage.tsx";

afterEach(cleanup);

const notices = [
  { title: "ffmpeg 8.1", text: "GNU LESSER GENERAL PUBLIC LICENSE" },
  { title: "zlib", text: "zlib License" },
];

describe("LicensesPage", () => {
  it("lists one item per notice", () => {
    render(<LicensesPage notices={notices} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows each notice's title", () => {
    render(<LicensesPage notices={notices} />);
    expect(screen.getByText("ffmpeg 8.1")).toBeDefined();
  });

  it("shows each notice's text", () => {
    render(<LicensesPage notices={notices} />);
    expect(screen.getByText("zlib License")).toBeDefined();
  });

  it("says when there are no notices", () => {
    render(<LicensesPage notices={[]} />);
    expect(
      screen.getByText("This build carries no license notices."),
    ).toBeDefined();
  });
});
