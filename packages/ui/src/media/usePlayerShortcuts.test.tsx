import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { usePlayerShortcuts } from "./usePlayerShortcuts.ts";

afterEach(cleanup);

function PlayerShortcutsProbe({ onCall }: { onCall: (call: string) => void }) {
  const scopeRef = useRef<HTMLDivElement>(null);
  usePlayerShortcuts(
    {
      onTogglePlay: () => onCall("togglePlay"),
      onSkip: (direction) => onCall(`skip ${direction}`),
      onReplay: () => onCall("replay"),
      onToggleMute: () => onCall("toggleMute"),
    },
    scopeRef,
  );
  return (
    <div ref={scopeRef}>
      <button type="button">Next cue</button>
      <input type="range" aria-label="Volume" />
    </div>
  );
}

/** Renders the probe and returns the callbacks it has received so far. */
function renderProbe() {
  const calls: string[] = [];
  render(<PlayerShortcutsProbe onCall={(call) => calls.push(call)} />);
  return calls;
}

describe("usePlayerShortcuts", () => {
  it("toggles playback on Space", () => {
    const calls = renderProbe();
    fireEvent.keyDown(document.body, { key: " " });
    expect(calls).toEqual(["togglePlay"]);
  });

  it("toggles playback on K", () => {
    const calls = renderProbe();
    fireEvent.keyDown(document.body, { key: "k" });
    expect(calls).toEqual(["togglePlay"]);
  });

  it("leaves Space to a focused button", () => {
    const calls = renderProbe();
    fireEvent.keyDown(screen.getByRole("button", { name: "Next cue" }), {
      key: " ",
    });
    expect(calls).toEqual([]);
  });

  it("toggles playback on K while a button has focus", () => {
    const calls = renderProbe();
    fireEvent.keyDown(screen.getByRole("button", { name: "Next cue" }), {
      key: "k",
    });
    expect(calls).toEqual(["togglePlay"]);
  });

  it("skips back on the left arrow", () => {
    const calls = renderProbe();
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    expect(calls).toEqual(["skip back"]);
  });

  it("skips forward on the right arrow", () => {
    const calls = renderProbe();
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(calls).toEqual(["skip forward"]);
  });

  it("leaves the arrows to a focused slider", () => {
    const calls = renderProbe();
    fireEvent.keyDown(screen.getByRole("slider", { name: "Volume" }), {
      key: "ArrowRight",
    });
    expect(calls).toEqual([]);
  });

  it("replays the cue on R", () => {
    const calls = renderProbe();
    fireEvent.keyDown(document.body, { key: "r" });
    expect(calls).toEqual(["replay"]);
  });

  it("ignores J", () => {
    const calls = renderProbe();
    fireEvent.keyDown(document.body, { key: "j" });
    expect(calls).toEqual([]);
  });
});
