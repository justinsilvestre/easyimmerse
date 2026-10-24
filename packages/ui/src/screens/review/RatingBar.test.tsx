import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RatingBar } from "./RatingBar.tsx";

afterEach(cleanup);

const renderBack = (intervals: Parameters<typeof RatingBar>[0]["intervals"]) =>
  render(
    <RatingBar
      stage="back"
      buttons="two"
      intervals={intervals}
      onShowAnswer={() => {}}
      onRate={() => {}}
    />,
  );

const intervals = { again: "10 min", hard: "", good: "4 days", easy: "" };

describe("RatingBar", () => {
  it("shows the interval each grade would give", () => {
    renderBack(intervals);
    expect(screen.getByText("4 days")).toBeTruthy();
  });

  it("leaves the intervals out while they are hidden", () => {
    renderBack(null);
    expect(screen.queryByText("4 days")).toBeNull();
  });
});
