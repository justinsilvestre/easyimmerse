import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  exampleProjectReviewed,
  exampleProjectWithNewCards,
  exampleProjectWithReviewsDue,
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
  args: { project: exampleProjectReviewed, onOpen: fn(), onReview: fn() },
} satisfies Meta<typeof ProjectCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing is due and every card has been reviewed, so the card offers only to open the project. */
export const NothingToReview: Story = {};

/** Cards are due, so the card offers to review them, with their count. */
export const ReviewsDue: Story = {
  args: { project: exampleProjectWithReviewsDue },
};

/** Nothing is due, but some cards have never been reviewed, so the card offers to learn them. */
export const NewCardsToLearn: Story = {
  args: { project: exampleProjectWithNewCards },
};
