import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { NewLibraryItemForm } from "./NewLibraryItemForm.tsx";

const meta = {
  title: "Screens/Library Manage/NewLibraryItemForm",
  component: NewLibraryItemForm,
  args: {
    upload: "media",
    isCreating: false,
    failure: null,
    onChooseUpload: fn(),
    onCreate: fn(),
  },
} satisfies Meta<typeof NewLibraryItemForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const TextFile: Story = { args: { upload: "text" } };

export const Uploading: Story = { args: { isCreating: true } };

export const UploadFailed: Story = {
  args: {
    failure:
      "Im Park was added as a draft, but its files couldn't be uploaded. Open it below to upload them again.",
  },
};
