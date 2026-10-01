import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { fixtureTranslationCues } from "../storybook/fixtureTranslationCues.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { fixtureTrack } from "../testSupport/fixtureResponses.ts";
import { MediaScreenPlayer } from "./MediaScreenPlayer.tsx";

const meta = {
  title: "Screens/MediaScreenPlayer",
  component: MediaScreenPlayer,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    kind: "video",
    targetCues: fixtureTrack.cues,
    translationCues: fixtureTranslationCues,
    onWordActivated: fn(),
  },
} satisfies Meta<typeof MediaScreenPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PlaybackFailed: Story = {
  decorators: [
    withDispatchedActions(
      actions.playerPlaybackFailed(
        "The server could not provide the converted stream.",
      ),
    ),
  ],
};
