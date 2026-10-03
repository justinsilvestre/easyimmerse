import type { ProjectSummary } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ProjectList } from "./ProjectList.tsx";

const twoProjects: ProjectSummary[] = [
  {
    id: "project-1",
    name: "Dark, season one",
    language: "de",
    created_at: "2026-09-01T09:00:00Z",
  },
  {
    id: "project-2",
    name: "Midnight Diner",
    language: "ja",
    created_at: "2026-09-10T12:00:00Z",
  },
];

const meta = {
  title: "Components/ProjectList",
  component: ProjectList,
  args: { projects: [], onOpen: fn() },
} satisfies Meta<typeof ProjectList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const TwoProjects: Story = { args: { projects: twoProjects } };
