import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConversionCacheSection } from "./ConversionCacheSection.tsx";

const meta = {
  title: "Components/ConversionCacheSection",
  component: ConversionCacheSection,
  args: { status: null, onClear: fn(), clearStatus: "" },
  decorators: [
    (Story) => (
      <div className="w-[36rem] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ConversionCacheSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unavailable: Story = {};

export const InUse: Story = {
  args: {
    status: {
      usageBytes: 1_230_000_000,
      limitBytes: 5_000_000_000,
      budgetBytes: 5_000_000_000,
      freeBytes: 40_000_000_000,
      spaceLow: false,
    },
  },
};

export const LowDiskSpace: Story = {
  args: {
    status: {
      usageBytes: 1_900_000_000,
      limitBytes: 2_000_000_000,
      budgetBytes: 5_000_000_000,
      freeBytes: 2_200_000_000,
      spaceLow: true,
    },
  },
};

export const AfterClearing: Story = {
  args: {
    status: {
      usageBytes: 0,
      limitBytes: 5_000_000_000,
      budgetBytes: 5_000_000_000,
      freeBytes: 41_000_000_000,
      spaceLow: false,
    },
    clearStatus: "Cleared 1.2 GB.",
  },
};
