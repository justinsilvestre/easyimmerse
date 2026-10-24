import type { FooterActivity } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import {
  describeFooterActivities,
  meanPercentOf,
  summarizeFooterActivities,
} from "./footerActivitiesSummary.ts";

function running(id: string, percent: number | null): FooterActivity {
  return {
    id,
    label: `Running ${id}`,
    opens: { step: { type: "goHome" }, label: "Show" },
    status: "running",
    percent,
  };
}

function failed(id: string): FooterActivity {
  return {
    id,
    label: `${id} failed`,
    opens: { step: { type: "goHome" }, label: "Show" },
    status: "failed",
  };
}

describe("summarizeFooterActivities", () => {
  it("counts the running tasks", () => {
    expect(
      summarizeFooterActivities([running("a", 1), running("b", null)]),
    ).toBe("2 tasks running");
  });

  it("puts the failures first beside the running count", () => {
    expect(
      summarizeFooterActivities([
        running("a", 1),
        failed("b"),
        running("c", 2),
      ]),
    ).toBe("1 failed, 2 running");
  });

  it("counts the failed tasks when none runs", () => {
    expect(summarizeFooterActivities([failed("a"), failed("b")])).toBe(
      "2 tasks failed",
    );
  });
});

describe("meanPercentOf", () => {
  it("averages the running tasks whose percentage is known", () => {
    expect(
      meanPercentOf([running("a", 20), running("b", null), running("c", 60)]),
    ).toBe(40);
  });

  it("is null while no running task knows its percentage", () => {
    expect(meanPercentOf([running("a", null), failed("b")])).toBeNull();
  });

  it("leaves the failed tasks out", () => {
    expect(meanPercentOf([running("a", 50), failed("b")])).toBe(50);
  });
});

describe("describeFooterActivities", () => {
  it("joins the labels into sentences", () => {
    expect(describeFooterActivities([running("a", 1), failed("b")])).toBe(
      "Running a. b failed.",
    );
  });

  it("is empty with no activities", () => {
    expect(describeFooterActivities([])).toBe("");
  });
});
