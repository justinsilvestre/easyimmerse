import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { SuggestionsSection } from "./SuggestionsSection.tsx";

const meta = {
  title: "Screens/Settings/SuggestionsSection",
  component: SuggestionsSection,
  decorators: [withAppStore],
} satisfies Meta<typeof SuggestionsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NothingDismissed: Story = {};

export const WithDismissedSuggestion: Story = {
  parameters: {
    appStore: {
      preferenceStorage: {
        loadPreference: async (key: string) =>
          key === "dismissedSuggestions" ? '["backup"]' : null,
        savePreference: async () => undefined,
      },
    },
  },
};
