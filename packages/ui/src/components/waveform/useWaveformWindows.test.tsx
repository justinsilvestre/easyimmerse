import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWaveformWindows } from "./useWaveformWindows.ts";
import type { FetchWaveformWindow } from "./waveformWindowStore.ts";

afterEach(cleanup);

function WindowList({ fetchWindow }: { fetchWindow: FetchWaveformWindow }) {
  const windows = useWaveformWindows(fetchWindow, {
    viewStartMs: 0,
    viewEndMs: 60_000,
    focusMs: 10_000,
    durationMs: 600_000,
  });
  return <output>{[...windows.keys()].join(",")}</output>;
}

describe("useWaveformWindows", () => {
  it("shows the windows once they load", async () => {
    const fetchWindow = async () => new Uint8Array(3000);
    render(<WindowList fetchWindow={fetchWindow} />);
    await vi.waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("0,30000,60000"),
    );
  });

  it("shows nothing while no window has loaded", () => {
    const fetchWindow = () => new Promise<Uint8Array | null>(() => undefined);
    render(<WindowList fetchWindow={fetchWindow} />);
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("stops requesting windows after unmount", async () => {
    const fetchWindow = vi.fn(async () => new Uint8Array(3000));
    const { unmount } = render(<WindowList fetchWindow={fetchWindow} />);
    unmount();
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchWindow).toHaveBeenCalledTimes(3);
  });
});
