import { resetBackend } from "@easyimmerse/backend";
import { actions, interiorSeekTime } from "@easyimmerse/state";
import type { Cue, SubtitleRole } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fixtureTrack } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { SubtitlesPanel } from "./SubtitlesPanel.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

function renderPanel(
  cues: readonly Cue[] | null = fixtureTrack.cues,
  onAddSubtitles: (role: SubtitleRole) => void = () => undefined,
) {
  return renderWithAppStore(
    <SubtitlesPanel
      cues={cues}
      onAddSubtitles={onAddSubtitles}
      onGenerateSubtitles={() => undefined}
    />,
  );
}

const findList = () => screen.getByRole("list", { name: "Subtitles" });

describe("SubtitlesPanel", () => {
  describe("with cues", () => {
    it("shows one card per cue", () => {
      renderPanel();
      expect(within(findList()).getAllByRole("listitem")).toHaveLength(4);
    });

    it("shows a cue's start time and text without markup", () => {
      renderPanel();
      expect(within(findList()).getAllByRole("button")[2]?.textContent).toBe(
        "0:03Everything is quiet.",
      );
    });

    it("seeks just inside the frame at a cue's start when its card is clicked", () => {
      const { effects } = renderPanel();
      fireEvent.click(screen.getByRole("button", { name: /The dog/ }));
      expect(effects.calls).toContainEqual({
        type: "seekPlayer",
        ms: interiorSeekTime(1750, undefined),
      });
    });

    it("highlights the card of the cue at the current time", () => {
      const { store } = renderPanel();
      act(() => {
        store.dispatch(actions.playerTimeChanged(2000));
      });
      expect(
        screen.getByRole("button", { current: true }).textContent,
      ).toContain("The dog wants to eat.");
    });

    it("highlights no card before the first cue", () => {
      renderPanel();
      expect(screen.queryByRole("button", { current: true })).toBeNull();
    });
  });

  describe("without cues", () => {
    it("offers adding a target-language subtitles file", () => {
      const roles: SubtitleRole[] = [];
      renderPanel(null, (role) => roles.push(role));
      fireEvent.click(
        screen.getByRole("button", { name: "Add target-language subtitles" }),
      );
      expect(roles).toEqual(["target"]);
    });

    it("offers adding a translation subtitles file", () => {
      const roles: SubtitleRole[] = [];
      renderPanel([], (role) => roles.push(role));
      fireEvent.click(
        screen.getByRole("button", { name: "Add translation subtitles" }),
      );
      expect(roles).toEqual(["translation"]);
    });

    it("disables generating subtitles for now", () => {
      renderPanel(null);
      expect(
        screen.getByRole("button", { name: "Generate subtitles" }),
      ).toHaveProperty("disabled", true);
    });
  });
});
