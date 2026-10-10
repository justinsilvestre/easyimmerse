import type { TrackSelection } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TrackChoiceDialog } from "./TrackChoiceDialog.tsx";
import type { TrackChoice } from "./trackChoiceLabels.ts";

afterEach(cleanup);

const video: TrackChoice[] = [
  {
    streamIndex: 0,
    language: null,
    title: null,
    format: "H.264 1920×1080",
    isDefault: true,
  },
];

const audio: TrackChoice[] = [
  {
    streamIndex: 1,
    language: "ja",
    title: null,
    format: "AAC stereo",
    isDefault: false,
  },
  {
    streamIndex: 2,
    language: "ja",
    title: "Commentary",
    format: "AAC stereo",
    isDefault: false,
  },
  {
    streamIndex: 3,
    language: "en",
    title: null,
    format: "AC-3 5.1",
    isDefault: true,
  },
];

function renderDialog(selection: TrackSelection | null = null) {
  const chosen: TrackSelection[] = [];
  const selected: TrackSelection[] = [];
  let cancelled = 0;
  render(
    <TrackChoiceDialog
      videoTracks={video}
      audioTracks={audio}
      selection={selection}
      onSelect={(changed) => selected.push(changed)}
      onChoose={(chosenSelection) => chosen.push(chosenSelection)}
      onCancel={() => {
        cancelled += 1;
      }}
    />,
  );
  return { chosen, selected, wasCancelled: () => cancelled > 0 };
}

const clickChoose = () =>
  fireEvent.click(screen.getByRole("button", { name: "Choose" }));

describe("TrackChoiceDialog", () => {
  it("is titled Choose tracks", () => {
    renderDialog();
    expect(screen.getByRole("dialog", { name: "Choose tracks" })).toBeDefined();
  });

  it("groups the tracks by kind", () => {
    renderDialog();
    expect(
      screen.getAllByRole("group").map((group) => group.textContent),
    ).toEqual([
      expect.stringContaining("Video"),
      expect.stringContaining("Audio"),
    ]);
  });

  it("labels a track with its language and title", () => {
    renderDialog();
    expect(
      screen.getByRole("radio", { name: "Japanese · Commentary" }),
    ).toBeDefined();
  });

  it("describes a track with its format", () => {
    renderDialog();
    expect(
      screen.getByRole("radio", {
        name: "English",
        description: "AC-3 5.1 · Default",
      }),
    ).toBeDefined();
  });

  it("numbers a track without language or title", () => {
    renderDialog();
    expect(screen.getByRole("radio", { name: "Track 1" })).toBeDefined();
  });

  it("selects the default track of each kind at first", () => {
    renderDialog();
    expect(screen.getByRole("radio", { name: "English" })).toHaveProperty(
      "checked",
      true,
    );
  });

  it("starts from the given selection when there is one", () => {
    renderDialog({ video: 0, audio: 2 });
    expect(
      screen.getByRole("radio", { name: "Japanese · Commentary" }),
    ).toHaveProperty("checked", true);
  });

  it("returns the shown selection when nothing is changed", () => {
    const { chosen } = renderDialog();
    clickChoose();
    expect(chosen).toEqual([{ video: 0, audio: 3 }]);
  });

  it("reports a changed selection", () => {
    const { selected } = renderDialog();
    fireEvent.click(
      screen.getByRole("radio", { name: "Japanese · Commentary" }),
    );
    expect(selected).toEqual([{ video: 0, audio: 2 }]);
  });

  it("returns the given selection when Choose is clicked", () => {
    const { chosen } = renderDialog({ video: 0, audio: 2 });
    clickChoose();
    expect(chosen).toEqual([{ video: 0, audio: 2 }]);
  });

  it("calls onCancel when Cancel is clicked", () => {
    const { wasCancelled } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(wasCancelled()).toBe(true);
  });
});
