import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { updateStoredPlaces } from "./updateStoredPlaces.ts";

/** Applies an action to the stored places after the given earlier actions. */
const apply = (action: AppAction, ...before: AppAction[]) => {
  const app = stateAfter(...before);
  return updateStoredPlaces(app.storedPlaces, action, app);
};

const location = { chapterIndex: 1, paragraphIndex: 4, offset: 10 };

const openBook = (stored: typeof location | null): AppAction[] => [
  actions.openMediaFileRequested("p1", "b1"),
  actions.readingLocationLoaded("b1", stored),
];

/** A media file whose player has loaded it and played to 14 seconds. */
const playedTo14: AppAction[] = [
  actions.openMediaFileRequested("p1", "m1"),
  actions.playerDurationChanged(60),
  actions.playerTimeChanged(14),
];

describe("updateStoredPlaces", () => {
  describe("for the reading location", () => {
    it("loads the reading place of a media file when it opens", () => {
      const [, effects] = apply(actions.openMediaFileRequested("p1", "b1"));
      expect(effects).toContainEqual({
        type: "loadReadingLocation",
        mediaFileId: "b1",
      });
    });

    it("does not load the reading place again when it is known", () => {
      const [, effects] = apply(
        actions.openMediaFileRequested("p1", "b1"),
        ...openBook(null),
        actions.closeMedia(),
      );
      expect(effects).not.toContainEqual({
        type: "loadReadingLocation",
        mediaFileId: "b1",
      });
    });

    it("stores the loaded location for readingLocationLoaded", () => {
      const [places] = apply(actions.readingLocationLoaded("b1", location));
      expect(places.reading.b1).toEqual(location);
    });

    it("records a book without a stored location for readingLocationLoaded", () => {
      const [places] = apply(actions.readingLocationLoaded("b1", null));
      expect(places.reading.b1).toBeNull();
    });

    it("keeps a location reported before the stored one arrived for readingLocationLoaded", () => {
      const [places] = apply(
        actions.readingLocationLoaded("b1", null),
        actions.readingLocationReported("b1", location),
      );
      expect(places.reading.b1).toEqual(location);
    });

    it("stores the reported location for readingLocationReported", () => {
      const moved = { ...location, offset: 80 };
      const [places] = apply(
        actions.readingLocationReported("b1", moved),
        ...openBook(location),
      );
      expect(places.reading.b1).toEqual(moved);
    });

    it("returns a saveReadingLocation effect for readingLocationReported in a new paragraph", () => {
      const moved = { ...location, paragraphIndex: 5, offset: 0 };
      const [, effects] = apply(
        actions.readingLocationReported("b1", moved),
        ...openBook(location),
      );
      expect(effects).toEqual([
        { type: "saveReadingLocation", mediaFileId: "b1", location: moved },
      ]);
    });

    it("returns no effects for readingLocationReported within the same paragraph", () => {
      const [, effects] = apply(
        actions.readingLocationReported("b1", { ...location, offset: 80 }),
        ...openBook(location),
      );
      expect(effects).toEqual([]);
    });

    it("returns a saveReadingLocation effect with the last location for closeMedia", () => {
      const [, effects] = apply(actions.closeMedia(), ...openBook(location));
      expect(effects).toEqual([
        { type: "saveReadingLocation", mediaFileId: "b1", location },
      ]);
    });

    it("returns no effects for closeMedia when the open file has no reading location", () => {
      const [, effects] = apply(actions.closeMedia(), ...openBook(null));
      expect(effects).toEqual([]);
    });
  });

  describe("for the playback position", () => {
    it("loads the playback position of a media file when it opens", () => {
      const [, effects] = apply(actions.openMediaFileRequested("p1", "m1"));
      expect(effects).toContainEqual({
        type: "loadPlaybackPosition",
        mediaFileId: "m1",
      });
    });

    it("does not load the playback position again when it is known", () => {
      const [, effects] = apply(
        actions.openMediaFileRequested("p1", "m1"),
        actions.playbackPositionLoaded("m1", null),
      );
      expect(effects).not.toContainEqual({
        type: "loadPlaybackPosition",
        mediaFileId: "m1",
      });
    });

    it("loads nothing when Settings open over the media file", () => {
      const [, effects] = apply(
        actions.settingsRequested(),
        actions.openMediaFileRequested("p1", "m1"),
      );
      expect(effects).toEqual([]);
    });

    it("stores the loaded position for playbackPositionLoaded", () => {
      const [places] = apply(actions.playbackPositionLoaded("m1", 8000));
      expect(places.playback.m1).toBe(8000);
    });

    it("saves the position when playback enters a new stretch for playerTimeChanged", () => {
      const [, effects] = apply(actions.playerTimeChanged(15.5), ...playedTo14);
      expect(effects).toEqual([
        { type: "savePlaybackPosition", mediaFileId: "m1", ms: 15_500 },
      ]);
    });

    it("saves nothing within the same stretch for playerTimeChanged", () => {
      const [, effects] = apply(actions.playerTimeChanged(14.5), ...playedTo14);
      expect(effects).toEqual([]);
    });

    it("saves the position when playback pauses for playerPlayingChanged", () => {
      const [, effects] = apply(
        actions.playerPlayingChanged(false),
        ...playedTo14,
      );
      expect(effects).toContainEqual({
        type: "savePlaybackPosition",
        mediaFileId: "m1",
        ms: 14_000,
      });
    });

    it("saves the position for closeMedia", () => {
      const [, effects] = apply(actions.closeMedia(), ...playedTo14);
      expect(effects).toEqual([
        { type: "savePlaybackPosition", mediaFileId: "m1", ms: 14_000 },
      ]);
    });

    it("remembers the saved position for closeMedia, so that reopening the file finds it", () => {
      const [places] = apply(actions.closeMedia(), ...playedTo14);
      expect(places.playback.m1).toBe(14_000);
    });

    it("saves nothing before the player has loaded the file", () => {
      const [, effects] = apply(
        actions.closeMedia(),
        actions.openMediaFileRequested("p1", "m1"),
        actions.playerTimeChanged(14),
      );
      expect(effects).toEqual([]);
    });

    it("saves the position when another media file opens", () => {
      const [, effects] = apply(
        actions.openMediaFileRequested("p1", "m2"),
        ...playedTo14,
      );
      expect(effects).toContainEqual({
        type: "savePlaybackPosition",
        mediaFileId: "m1",
        ms: 14_000,
      });
    });

    it("saves nothing when the same media file is requested again", () => {
      const [, effects] = apply(
        actions.openMediaFileRequested("p1", "m1"),
        ...playedTo14,
      );
      expect(effects).toEqual([]);
    });

    it("saves nothing when Settings open over the media file", () => {
      const [, effects] = apply(actions.settingsRequested(), ...playedTo14);
      expect(effects).toEqual([]);
    });
  });
});
