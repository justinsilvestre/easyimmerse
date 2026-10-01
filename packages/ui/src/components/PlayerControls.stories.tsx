import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { fixtureTrack } from "../testSupport/fixtureResponses.ts";
import { PlayerControls } from "./PlayerControls.tsx";

const meta = {
  title: "Components/PlayerControls",
  component: PlayerControls,
  decorators: [
    (Story) => (
      <div className="w-[min(48rem,calc(100vw-2rem))]">
        <Story />
      </div>
    ),
    withAppStore,
  ],
  args: { cues: fixtureTrack.cues, fullscreenTarget: { current: null } },
} satisfies Meta<typeof PlayerControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MediaLoading: Story = {};

export const Paused: Story = {
  decorators: [
    withDispatchedActions(
      actions.playerDurationKnown(5000),
      actions.playerTimeChanged(1800),
    ),
  ],
};

export const Playing: Story = {
  decorators: [
    withDispatchedActions(
      actions.playerDurationKnown(5000),
      actions.playerTimeChanged(1800),
      actions.playerPlayingChanged(true),
    ),
  ],
};

export const Looping: Story = {
  decorators: [
    withDispatchedActions(
      actions.playerDurationKnown(5000),
      actions.playerTimeChanged(2200),
      actions.loopRequested({ start_ms: 1750, end_ms: 3000 }),
    ),
  ],
};
