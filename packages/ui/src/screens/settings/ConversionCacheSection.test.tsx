import type { ConversionCacheStatus } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ConversionCacheView } from "./ConversionCacheSection.tsx";
import { ConversionCacheSection } from "./ConversionCacheSection.tsx";

afterEach(cleanup);

const status: ConversionCacheStatus = {
  usage_bytes: 1_230_000_000,
  limit_bytes: 5_000_000_000,
  budget_bytes: 5_000_000_000,
  free_bytes: 40_000_000_000,
  space_low: false,
  chosen_budget_bytes: null,
};

const available: ConversionCacheView = { kind: "available", status };

const lowSpace: ConversionCacheView = {
  kind: "available",
  status: {
    ...status,
    limit_bytes: 2_000_000_000,
    free_bytes: 2_800_000_000,
    space_low: true,
  },
};

function renderSection(
  cache: ConversionCacheView,
  onClear: () => void = () => undefined,
  clearStatus = "",
  onBudgetChange: (budgetBytes: number | null) => void = () => undefined,
) {
  render(
    <ConversionCacheSection
      cache={cache}
      onClear={onClear}
      clearStatus={clearStatus}
      onBudgetChange={onBudgetChange}
    />,
  );
}

describe("ConversionCacheSection", () => {
  describe("while the status loads", () => {
    it("shows only the heading", () => {
      renderSection({ kind: "loading" });
      expect(
        screen.queryByText(/The cache is using/, { selector: "p" }),
      ).toBeNull();
    });
  });

  describe("when conversion is unavailable", () => {
    it("says so in one line", () => {
      renderSection({ kind: "unavailable" });
      expect(
        screen.getByText(
          "Media conversion is unavailable, so there is no cache.",
        ),
      ).toBeDefined();
    });

    it("offers no clearing", () => {
      renderSection({ kind: "unavailable" });
      expect(screen.queryByRole("button")).toBeNull();
    });
  });

  describe("when the status could not be read", () => {
    it("shows the failure", () => {
      renderSection({ kind: "failed", message: "Internal Server Error" });
      expect(screen.getByRole("alert").textContent).toBe(
        "The media cache could not be checked: Internal Server Error",
      );
    });
  });

  describe("with a status", () => {
    it("states the usage and the limit", () => {
      renderSection(available);
      expect(
        screen.getByText("The cache is using 1.2 GB of 5 GB."),
      ).toBeDefined();
    });

    it("shows the usage on a meter", () => {
      renderSection(available);
      expect(screen.getByRole("meter").getAttribute("value")).toBe(
        "1230000000",
      );
    });

    it("shows no warning while space is not low", () => {
      renderSection(available);
      expect(screen.queryByRole("note")).toBeNull();
    });

    it("warns that fewer conversions are kept when space is low", () => {
      renderSection(lowSpace);
      expect(screen.getByRole("note").textContent).toContain(
        "fewer processed files are kept",
      );
    });

    it("shows the automatic size while no budget is chosen", () => {
      renderSection(available);
      expect(
        screen.getByRole("combobox", { name: "Maximum size" }),
      ).toHaveProperty("value", "auto");
    });

    it("shows the chosen size", () => {
      renderSection({
        kind: "available",
        status: { ...status, chosen_budget_bytes: 10_000_000_000 },
      });
      expect(
        screen.getByRole("combobox", { name: "Maximum size" }),
      ).toHaveProperty("value", "10000000000");
    });

    it("reports a chosen size in bytes", () => {
      const chosen: (number | null)[] = [];
      renderSection(available, undefined, "", (bytes) => chosen.push(bytes));
      fireEvent.change(screen.getByRole("combobox", { name: "Maximum size" }), {
        target: { value: "5000000000" },
      });
      expect(chosen).toEqual([5_000_000_000]);
    });

    it("reports the automatic size as null", () => {
      const chosen: (number | null)[] = [];
      renderSection(
        {
          kind: "available",
          status: { ...status, chosen_budget_bytes: 10_000_000_000 },
        },
        undefined,
        "",
        (bytes) => chosen.push(bytes),
      );
      fireEvent.change(screen.getByRole("combobox", { name: "Maximum size" }), {
        target: { value: "auto" },
      });
      expect(chosen).toEqual([null]);
    });

    it("calls onClear when the clear button is clicked", () => {
      let cleared = 0;
      renderSection(available, () => {
        cleared += 1;
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Clear media cache" }),
      );
      expect(cleared).toBe(1);
    });

    it("shows the clear status beside the button", () => {
      renderSection(available, undefined, "Cleared 1.2 GB.");
      expect(screen.getByRole("status").textContent).toBe("Cleared 1.2 GB.");
    });
  });
});
