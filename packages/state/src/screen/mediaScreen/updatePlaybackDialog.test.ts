import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import {
  exampleCopyPlayback,
  exampleTracksOneEach,
  exampleTracksTwoAudio,
  exampleTranscodePlayback,
} from "./examplePlayback.ts";
import {
  environmentMeasured,
  fileOnDisk,
  mediaFilesListed,
  planSettled,
  tracksSettled,
} from "./playbackTestActions.ts";
import { updatePlaybackDialog } from "./updatePlaybackDialog.ts";

const savedChoice = {
  ...fileOnDisk,
  track_selection_json: '{"video":0,"audio":1}',
};

/** The dialog after an action, on the media screen of m1 after the given earlier actions. */
const dialogAfter = (action: AppAction, ...before: AppAction[]) => {
  const app = stateAfter(
    actions.openMediaFileRequested("p1", "m1"),
    actions.preferencesLoaded({}),
    ...before,
  );
  return updatePlaybackDialog(app.screen.dialog, action, app);
};

const playing = [
  mediaFilesListed(savedChoice),
  tracksSettled(exampleTracksOneEach),
  environmentMeasured,
];

describe("updatePlaybackDialog", () => {
  it("opens the track choice before the first play when a kind has several tracks and no choice is saved", () => {
    expect(
      dialogAfter(tracksSettled(exampleTracksTwoAudio), mediaFilesListed()),
    ).toEqual({ kind: "trackChoice", selection: null, stage: "choosing" });
  });

  it("leaves the track choice closed when a choice is saved", () => {
    expect(
      dialogAfter(
        tracksSettled(exampleTracksTwoAudio),
        mediaFilesListed(savedChoice),
      ),
    ).toBeNull();
  });

  it("opens the track choice from the saved choice when asked", () => {
    expect(dialogAfter(actions.trackChoiceRequested(), ...playing)).toEqual({
      kind: "trackChoice",
      selection: { video: 0, audio: 1 },
      stage: "confirming",
    });
  });

  it("shows the tracks the user selects", () => {
    expect(
      dialogAfter(
        actions.trackChoiceChanged({ video: 0, audio: 2 }),
        mediaFilesListed(),
        tracksSettled(exampleTracksTwoAudio),
      ),
    ).toEqual({
      kind: "trackChoice",
      selection: { video: 0, audio: 2 },
      stage: "choosing",
    });
  });

  it("closes the track choice once tracks are chosen", () => {
    expect(
      dialogAfter(
        actions.tracksChosen({ video: 0, audio: 2 }),
        mediaFilesListed(),
        tracksSettled(exampleTracksTwoAudio),
      ),
    ).toBeNull();
  });

  it("opens the conversion notice when the plan re-encodes a track", () => {
    expect(
      dialogAfter(planSettled(exampleTranscodePlayback), ...playing),
    ).toEqual({ kind: "conversionNotice", dismissForGood: true });
  });

  it("leaves the conversion notice closed for a plan that only copies the tracks", () => {
    expect(
      dialogAfter(planSettled(exampleCopyPlayback), ...playing),
    ).toBeNull();
  });

  it("leaves the conversion notice closed once the preference dismisses it", () => {
    expect(
      dialogAfter(
        planSettled(exampleTranscodePlayback),
        actions.preferenceSet("conversionNoticeDismissed", "true"),
        ...playing,
      ),
    ).toBeNull();
  });

  it("leaves the conversion notice closed once the user has accepted it", () => {
    expect(
      dialogAfter(
        planSettled(exampleTranscodePlayback),
        ...playing,
        planSettled(exampleTranscodePlayback),
        actions.conversionNoticeAccepted(),
      ),
    ).toBeNull();
  });

  it("leaves the track choice open when a plan that re-encodes settles meanwhile", () => {
    expect(
      dialogAfter(
        planSettled(exampleTranscodePlayback),
        ...playing,
        actions.trackChoiceRequested(),
      ),
    ).toMatchObject({ kind: "trackChoice" });
  });

  it("closes the track choice when it is cancelled", () => {
    expect(
      dialogAfter(
        actions.trackChoiceCancelled(),
        mediaFilesListed(),
        tracksSettled(exampleTracksTwoAudio),
      ),
    ).toBeNull();
  });

  it("clears the box of the conversion notice when it is toggled", () => {
    expect(
      dialogAfter(
        actions.conversionNoticeDismissalToggled(),
        ...playing,
        planSettled(exampleTranscodePlayback),
      ),
    ).toEqual({ kind: "conversionNotice", dismissForGood: false });
  });

  it("closes the conversion notice once it is accepted", () => {
    expect(
      dialogAfter(
        actions.conversionNoticeAccepted(),
        ...playing,
        planSettled(exampleTranscodePlayback),
      ),
    ).toBeNull();
  });
});
