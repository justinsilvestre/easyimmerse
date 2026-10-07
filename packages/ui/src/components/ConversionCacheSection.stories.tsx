import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConversionCacheSection } from "./ConversionCacheSection.tsx";

const meta = {
  title: "Components/ConversionCacheSection",
  component: ConversionCacheSection,
  args: {
    cache: { kind: "unavailable" },
    onClear: fn(),
    clearStatus: "",
    onBudgetChange: fn(),
  },
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

export const Loading: Story = { args: { cache: { kind: "loading" } } };

export const Failed: Story = {
  args: { cache: { kind: "failed", message: "Internal Server Error" } },
};

export const InUse: Story = {
  args: {
    cache: {
      kind: "available",
      status: {
        usage_bytes: 1_230_000_000,
        limit_bytes: 5_000_000_000,
        budget_bytes: 5_000_000_000,
        free_bytes: 40_000_000_000,
        space_low: false,
        chosen_budget_bytes: null,
      },
    },
  },
};

export const LowDiskSpace: Story = {
  args: {
    cache: {
      kind: "available",
      status: {
        usage_bytes: 1_900_000_000,
        limit_bytes: 2_000_000_000,
        budget_bytes: 5_000_000_000,
        free_bytes: 2_200_000_000,
        space_low: true,
        chosen_budget_bytes: null,
      },
    },
  },
};

export const AfterClearing: Story = {
  args: {
    cache: {
      kind: "available",
      status: {
        usage_bytes: 0,
        limit_bytes: 5_000_000_000,
        budget_bytes: 5_000_000_000,
        free_bytes: 41_000_000_000,
        space_low: false,
        chosen_budget_bytes: null,
      },
    },
    clearStatus: "Cleared 1.2 GB.",
  },
};
