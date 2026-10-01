import type { ProjectSummary } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ProjectList } from "./ProjectList.tsx";

const twoProjects: ProjectSummary[] = [
  {
    id: "project-1",
    name: "Dark, season one",
    target_language: "de",
    translation_language: "en",
    created_at: "2026-09-01T09:00:00Z",
    last_opened_at: "2026-09-28T19:30:00Z",
  },
  {
    id: "project-2",
    name: "Midnight Diner",
    target_language: "ja",
    translation_language: "en",
    created_at: "2026-09-10T12:00:00Z",
    last_opened_at: "2026-09-12T21:15:00Z",
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
