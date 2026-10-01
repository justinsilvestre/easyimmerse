import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { HelpLink } from "../components/HelpLink.tsx";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { fixtureProject } from "../testSupport/fixtureProject.ts";
import { ProjectScreenView } from "./ProjectScreenView.tsx";

const meta = {
  title: "Screens/ProjectScreenView",
  component: ProjectScreenView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    project: fixtureProject,
    flashcardCount: 128,
    dictionaryStatus: "ready",
    onBack: fn(),
    onOpenMedia: fn(),
    onAddMedia: fn(),
    onRemoveMedia: fn(),
    onEditSettings: fn(),
    onSetUpDictionaries: fn(),
    onExportAnkiPackage: fn(),
    onSetUpAnkiConnect: fn(),
    onStartReview: fn(),
    headerActions: <HelpLink />,
  },
} satisfies Meta<typeof ProjectScreenView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithMedia: Story = {};

export const NoMedia: Story = {
  args: {
    project: { ...fixtureProject, media: [] },
    flashcardCount: 0,
  },
};

export const DictionariesMissing: Story = {
  args: { dictionaryStatus: "missing" },
};
