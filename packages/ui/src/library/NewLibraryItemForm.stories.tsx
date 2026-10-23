import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { NewLibraryItemForm } from "./NewLibraryItemForm.tsx";

const meta = {
  title: "Library/NewLibraryItemForm",
  component: NewLibraryItemForm,
  args: { isCreating: false, failure: null, onCreate: fn() },
} satisfies Meta<typeof NewLibraryItemForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Uploading: Story = { args: { isCreating: true } };

export const UploadFailed: Story = {
  args: {
    failure:
      "Im Park was added as a draft, but its files could not be uploaded. Open it below to upload them again.",
  },
};
