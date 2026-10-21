import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { INITIAL_VIEWPORTS } from "storybook/viewport";
import {
  exampleProjectReviewed,
  exampleProjectWithNewCards,
  exampleProjectWithReviewsDue,
  exampleReviewCounts,
} from "./exampleProjects.ts";
import { ProjectCard } from "./ProjectCard.tsx";

const meta = {
  title: "Projects/ProjectCard",
  component: ProjectCard,
  decorators: [
    (Story) => (
      <div className="w-[min(40rem,calc(100vw-2rem))]">
        <Story />
      </div>
    ),
  ],
  args: {
    project: exampleProjectReviewed,
    review: exampleReviewCounts[2] ?? null,
    onOpen: fn(),
    onReview: fn(),
  },
} satisfies Meta<typeof ProjectCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing is due and every card has been reviewed, so the card offers only to open the project. */
export const NothingToReview: Story = {};

/** Cards are due, so the card offers to review them, with their count. */
export const ReviewsDue: Story = {
  args: {
    project: exampleProjectWithReviewsDue,
    review: exampleReviewCounts[0] ?? null,
  },
};

/** Nothing is due, but some cards have never been reviewed, so the card offers to learn them. */
export const NewCardsToLearn: Story = {
  args: {
    project: exampleProjectWithNewCards,
    review: exampleReviewCounts[1] ?? null,
  },
};

/** At phone width, the review button shows only the count of cards due. */
export const ReviewsDueOnAPhone: Story = {
  parameters: { viewport: { options: INITIAL_VIEWPORTS } },
  globals: { viewport: { value: "iphonex", isRotated: false } },
  args: {
    project: exampleProjectWithReviewsDue,
    review: exampleReviewCounts[0] ?? null,
  },
};
