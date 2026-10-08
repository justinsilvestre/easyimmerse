import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoadingStatus, Skeleton } from "./Skeleton.tsx";

const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
  args: { className: "h-4 w-48" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {};

export const Block: Story = { args: { className: "h-24 w-80 rounded-lg" } };

export const LoadingCard: Story = {
  render: () => (
    <LoadingStatus label="Loading" className="w-80">
      <div className="flex items-center gap-4 rounded-lg border border-line bg-surface px-4 py-3">
        <Skeleton className="size-10 shrink-0" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </LoadingStatus>
  ),
};
