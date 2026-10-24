import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { DisplaySection } from "./DisplaySection.tsx";

const meta = {
  title: "Screens/Settings/DisplaySection",
  component: DisplaySection,
  decorators: [withAppStore],
} satisfies Meta<typeof DisplaySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
