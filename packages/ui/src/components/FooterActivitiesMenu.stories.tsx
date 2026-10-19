import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { sampleFooterActivities as samples } from "../storybook/sampleFooterActivities.ts";
import { FooterActivitiesMenu } from "./FooterActivitiesMenu.tsx";

const meta = {
  title: "Components/FooterActivities/FooterActivitiesMenu",
  component: FooterActivitiesMenu,
  decorators: [
    (Story) => (
      <div className="flex h-48 w-80 items-end">
        <Story />
      </div>
    ),
  ],
  args: {
    activities: [samples.dictionaryImport, samples.mediaFetch],
    onOpen: fn(),
  },
} satisfies Meta<typeof FooterActivitiesMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The bar stands at the mean of the percentages the tasks know. */
export const AllRunning: Story = {};

/** The bar slides while no task knows its percentage. */
export const AllRunningWithoutPercentage: Story = {
  args: {
    activities: [samples.flashcardExport, samples.subtitleGeneration],
  },
};

export const WithAFailure: Story = {
  args: {
    activities: [
      samples.dictionaryImportFailed,
      samples.mediaFetch,
      samples.flashcardExport,
    ],
  },
};

export const AllFailed: Story = {
  args: {
    activities: [samples.dictionaryImportFailed, samples.mediaFetchFailed],
  },
};

/** The menu as it opens above the button. */
export const Open: Story = {
  args: {
    activities: [
      samples.dictionaryImport,
      samples.mediaFetchFailed,
      samples.bookAlignment,
    ],
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: /running/ }),
    );
  },
};
