import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { fixtureTranslationCues } from "../storybook/fixtureTranslationCues.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { fixtureTrack } from "../testSupport/fixtureResponses.ts";
import { MediaView } from "./MediaView.tsx";

/** Moves the player into the second cue, so that the overlay and the panel's highlight show. */
const startInSecondCue = actions.seekRequested(2000);

const meta = {
  title: "Components/MediaView",
  component: MediaView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    kind: "video",
    playback: { kind: "direct", url: "/fixtures/sample.mp4" },
    targetCues: fixtureTrack.cues,
    translationCues: fixtureTranslationCues,
    onWordActivated: fn(),
    onAddSubtitles: fn(),
    onGenerateSubtitles: fn(),
  },
} satisfies Meta<typeof MediaView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VideoWithSubtitles: Story = {
  decorators: [withDispatchedActions(startInSecondCue)],
};

export const VideoWithoutSubtitles: Story = {
  args: { targetCues: null, translationCues: null },
};

export const AudioWithTranscript: Story = {
  args: {
    kind: "audio",
    playback: { kind: "direct", url: "/fixtures/sample.mp3" },
  },
  decorators: [withDispatchedActions(startInSecondCue)],
};

export const PanelClosed: Story = {
  decorators: [
    withDispatchedActions(startInSecondCue, actions.subtitlesPanelToggled()),
  ],
};

export const TranslationOverlay: Story = {
  decorators: [
    withDispatchedActions(startInSecondCue, actions.subtitleOverlayToggled()),
  ],
};
