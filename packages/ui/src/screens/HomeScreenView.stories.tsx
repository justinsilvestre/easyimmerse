import type { ProjectSummary } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { HelpLink } from "../components/HelpLink.tsx";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { HomeScreenView } from "./HomeScreenView.tsx";

const projects: ProjectSummary[] = [
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
  {
    id: "project-3",
    name: "Cidade de Deus and other Brazilian films",
    target_language: "pt-BR",
    translation_language: "de",
    created_at: "2026-06-02T08:00:00Z",
    last_opened_at: "2026-07-30T10:45:00Z",
  },
];

const meta = {
  title: "Screens/HomeScreenView",
  component: HomeScreenView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    projects: [],
    loading: false,
    error: null,
    onOpenProject: fn(),
    onCreateProject: fn(),
    headerActions: <HelpLink />,
  },
} satisfies Meta<typeof HomeScreenView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithProjects: Story = { args: { projects } };

export const Loading: Story = { args: { loading: true } };

export const LoadError: Story = {
  name: "Error",
  args: { error: "Could not reach the easyImmerse server." },
};
