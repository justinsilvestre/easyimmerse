import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { PreferenceToggle } from "./PreferenceToggle.tsx";

const meta = {
  title: "Components/PreferenceToggle",
  component: PreferenceToggle,
  decorators: [withAppStore],
  args: {
    preferenceKey: "losslessAudio",
    label: "Keep audio lossless when converting",
    hint: "Converted audio keeps its full quality but takes more disk space.",
  },
} satisfies Meta<typeof PreferenceToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = {
  decorators: [
    withDispatchedActions(actions.preferenceSet("losslessAudio", "true")),
  ],
};

export const WithoutHint: Story = {
  args: {
    preferenceKey: "showTranslations",
    label: "Show translations",
    hint: undefined,
  },
};
