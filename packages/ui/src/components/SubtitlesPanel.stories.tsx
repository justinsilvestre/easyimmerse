import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { fixtureTrack } from "../testSupport/fixtureResponses.ts";
import { SubtitlesPanel } from "./SubtitlesPanel.tsx";

const meta = {
  title: "Components/SubtitlesPanel",
  component: SubtitlesPanel,
  decorators: [
    (Story) => (
      <div className="h-96 w-80 bg-neutral-950">
        <Story />
      </div>
    ),
    withAppStore,
  ],
  args: {
    cues: fixtureTrack.cues,
    onAddSubtitles: fn(),
    onGenerateSubtitles: fn(),
  },
} satisfies Meta<typeof SubtitlesPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SecondCuePlaying: Story = {
  decorators: [withDispatchedActions(actions.playerTimeChanged(2000))],
};

export const BeforeFirstCue: Story = {};

export const NoSubtitles: Story = { args: { cues: null } };
