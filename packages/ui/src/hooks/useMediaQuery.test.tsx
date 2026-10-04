import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeMediaQueryList } from "../testSupport/createFakeMediaQueryList.ts";
import { useMediaQuery } from "./useMediaQuery.ts";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function MatchProbe() {
  return <output>{String(useMediaQuery("(min-width: 48rem)"))}</output>;
}

function renderProbe(matches: boolean) {
  const query = createFakeMediaQueryList(matches);
  vi.spyOn(window, "matchMedia").mockReturnValue(query);
  render(<MatchProbe />);
  return query;
}

describe("useMediaQuery", () => {
  it("reports the match on mount", () => {
    renderProbe(true);
    expect(screen.getByRole("status").textContent).toBe("true");
  });

  it("follows the match when it changes", () => {
    const query = renderProbe(true);
    act(() => query.changeMatch(false));
    expect(screen.getByRole("status").textContent).toBe("false");
  });
});
