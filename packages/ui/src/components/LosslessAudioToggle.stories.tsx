import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { LosslessAudioToggle } from "./LosslessAudioToggle.tsx";

const meta = {
  title: "Components/LosslessAudioToggle",
  component: LosslessAudioToggle,
  decorators: [withAppStore],
} satisfies Meta<typeof LosslessAudioToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = {
  decorators: [
    withDispatchedActions(actions.preferenceSet("losslessAudio", "true")),
  ],
};
