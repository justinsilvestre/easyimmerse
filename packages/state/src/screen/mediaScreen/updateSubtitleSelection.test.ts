import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { initialAppState } from "../../app/update.ts";
import type { MediaScreenState } from "../screenState.ts";
import { initialMainScreen } from "../screenState.ts";
import { updateSubtitleSelection } from "./updateSubtitleSelection.ts";

const route = { screen: "media", projectId: "p1", mediaFileId: "m1" } as const;

const screen = initialMainScreen(route) as MediaScreenState;

const targetShown = { target_track_id: "s1", translation_track_id: null };

const choose = (...args: Parameters<typeof actions.subtitleTrackChosen>) =>
  updateSubtitleSelection(
    screen,
    actions.subtitleTrackChosen(...args),
    route,
    initialAppState,
  )[1];

describe("updateSubtitleSelection", () => {
  it("saves the shown selection with the chosen translation track", () => {
    expect(choose("translation", "s2", targetShown)).toEqual([
      {
        type: "sendRequest",
        id: "media/m1/subtitleSelection/s1/s2",
        request: {
          kind: "setSubtitleSelection",
          projectId: "p1",
          mediaFileId: "m1",
          selection: { target_track_id: "s1", translation_track_id: "s2" },
        },
      },
    ]);
  });

  it("names an emptied role as none in the request's id", () => {
    expect(choose("target", null, targetShown)).toMatchObject([
      { id: "media/m1/subtitleSelection/none/none" },
    ]);
  });

  it("sends nothing for another action", () => {
    const [, effects] = updateSubtitleSelection(
      screen,
      actions.playRequested(),
      route,
      initialAppState,
    );
    expect(effects).toEqual([]);
  });
});
