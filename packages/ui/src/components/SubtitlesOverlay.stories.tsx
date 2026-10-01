import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { fixtureTranslationCues } from "../storybook/fixtureTranslationCues.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { fixtureTrack } from "../testSupport/fixtureResponses.ts";
import { SubtitlesOverlay } from "./SubtitlesOverlay.tsx";

const meta = {
  title: "Components/SubtitlesOverlay",
  component: SubtitlesOverlay,
  decorators: [
    (Story) => (
      <div className="flex h-64 w-[40rem] max-w-full items-end justify-center bg-linear-to-b from-slate-600 to-slate-900 p-6">
        <Story />
      </div>
    ),
    withAppStore,
  ],
  args: {
    targetCues: fixtureTrack.cues,
    translationCues: fixtureTranslationCues,
    onWordActivated: fn(),
  },
} satisfies Meta<typeof SubtitlesOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TargetWithTranslation: Story = {
  decorators: [withDispatchedActions(actions.playerTimeChanged(2000))],
};

export const TargetOnly: Story = {
  args: { translationCues: null },
  decorators: [withDispatchedActions(actions.playerTimeChanged(2000))],
};

export const TranslationOnTop: Story = {
  decorators: [
    withDispatchedActions(
      actions.playerTimeChanged(2000),
      actions.subtitleOverlayToggled(),
    ),
  ],
};

export const BetweenCues: Story = {
  decorators: [withDispatchedActions(actions.playerTimeChanged(3100))],
};

export const BeforeFirstCue: Story = {};
