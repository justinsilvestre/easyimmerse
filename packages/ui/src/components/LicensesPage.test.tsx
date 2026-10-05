import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { type LicenseNoticesState, LicensesPage } from "./LicensesPage.tsx";

afterEach(cleanup);

const loaded: LicenseNoticesState = {
  status: "loaded",
  groups: [
    {
      title: "FFmpeg",
      notices: [
        { title: "ffmpeg 8.1", text: "GNU LESSER GENERAL PUBLIC LICENSE" },
      ],
    },
    {
      title: "Rust crates",
      notices: [
        { title: "zlib-rs 0.6.0", text: "zlib License" },
        { title: "serde 1.0.0", text: "MIT License" },
      ],
    },
    { title: "JavaScript packages", notices: [] },
  ],
};

/** Opens the folded section whose summary shows the text, as clicking its summary does. */
function open(text: string) {
  const details = screen.getByText(text).closest("details");
  if (!details) throw new Error(`no folded section shows ${text}`);
  details.open = true;
  fireEvent(details, new Event("toggle"));
}

describe("LicensesPage", () => {
  it("lists one folded section per group that has notices", () => {
    render(<LicensesPage notices={loaded} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("counts the notices of each group", () => {
    render(<LicensesPage notices={loaded} />);
    expect(screen.getByText("2 notices")).toBeDefined();
  });

  it("leaves a group's notices out until the group is opened", () => {
    render(<LicensesPage notices={loaded} />);
    expect(screen.queryByText("zlib-rs 0.6.0")).toBeNull();
  });

  it("shows a group's notice titles once the group is opened", () => {
    render(<LicensesPage notices={loaded} />);
    open("Rust crates");
    expect(screen.getByText("zlib-rs 0.6.0")).toBeDefined();
  });

  it("shows a notice's text once the notice is opened", () => {
    render(<LicensesPage notices={loaded} />);
    open("Rust crates");
    open("zlib-rs 0.6.0");
    expect(screen.getByText("zlib License")).toBeDefined();
  });

  it("says when the notices are loading", () => {
    render(<LicensesPage notices={{ status: "loading" }} />);
    expect(screen.getByText("Loading the license notices…")).toBeDefined();
  });

  it("says when the notices could not be loaded", () => {
    render(<LicensesPage notices={{ status: "failed" }} />);
    expect(
      screen.getByText("The license notices could not be loaded."),
    ).toBeDefined();
  });

  it("says when there are no notices", () => {
    render(<LicensesPage notices={{ status: "loaded", groups: [] }} />);
    expect(
      screen.getByText("This build carries no license notices."),
    ).toBeDefined();
  });
});
