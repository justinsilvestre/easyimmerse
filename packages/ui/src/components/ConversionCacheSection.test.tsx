import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ConversionCacheStatus } from "./ConversionCacheSection.tsx";
import { ConversionCacheSection } from "./ConversionCacheSection.tsx";

afterEach(cleanup);

const status: ConversionCacheStatus = {
  usageBytes: 1_230_000_000,
  limitBytes: 5_000_000_000,
  budgetBytes: 5_000_000_000,
  freeBytes: 40_000_000_000,
  spaceLow: false,
};

const lowSpace: ConversionCacheStatus = {
  ...status,
  limitBytes: 2_000_000_000,
  freeBytes: 2_800_000_000,
  spaceLow: true,
};

function renderSection(
  cacheStatus: ConversionCacheStatus | null,
  onClear: () => void = () => undefined,
  clearStatus = "",
) {
  render(
    <ConversionCacheSection
      status={cacheStatus}
      onClear={onClear}
      clearStatus={clearStatus}
    />,
  );
}

describe("ConversionCacheSection", () => {
  describe("when conversion is unavailable", () => {
    it("says so in one line", () => {
      renderSection(null);
      expect(
        screen.getByText(
          "Video conversion is unavailable, so no converted videos are stored.",
        ),
      ).toBeDefined();
    });

    it("offers no clearing", () => {
      renderSection(null);
      expect(screen.queryByRole("button")).toBeNull();
    });
  });

  describe("with a status", () => {
    it("states the usage and the limit", () => {
      renderSection(status);
      expect(
        screen.getByText("Converted videos use 1.2 GB of 5 GB."),
      ).toBeDefined();
    });

    it("shows the usage on a meter", () => {
      renderSection(status);
      expect(screen.getByRole("meter").getAttribute("value")).toBe(
        "1230000000",
      );
    });

    it("shows no warning while space is not low", () => {
      renderSection(status);
      expect(screen.queryByRole("note")).toBeNull();
    });

    it("warns that fewer conversions are kept when space is low", () => {
      renderSection(lowSpace);
      expect(screen.getByRole("note").textContent).toContain(
        "fewer converted videos are kept",
      );
    });

    it("calls onClear when the clear button is clicked", () => {
      let cleared = 0;
      renderSection(status, () => {
        cleared += 1;
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Clear converted videos" }),
      );
      expect(cleared).toBe(1);
    });

    it("shows the clear status beside the button", () => {
      renderSection(status, undefined, "Cleared 1.2 GB.");
      expect(screen.getByRole("status").textContent).toBe("Cleared 1.2 GB.");
    });
  });
});
