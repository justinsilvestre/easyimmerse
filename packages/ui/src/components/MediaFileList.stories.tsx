import type { MediaFile } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { MediaFileList } from "./MediaFileList.tsx";

const twoMediaFiles: MediaFile[] = [
  {
    id: "media-1",
    project_id: "project-1",
    name: "Episode 1.mkv",
    source: { kind: "path", path: "/videos/Episode 1.mkv" },
    created_at_ms: 1756717200000,
    track_selection_json: null,
  },
  {
    id: "media-2",
    project_id: "project-1",
    name: "interview.mp3",
    source: {
      kind: "browser_file",
      size: 4820133,
      last_modified_ms: 1756800000000,
    },
    created_at_ms: 1756803600000,
    track_selection_json: null,
  },
];

const meta = {
  title: "Components/MediaFileList",
  component: MediaFileList,
  args: {
    mediaFiles: [],
    currentMediaFileId: null,
    addPending: false,
    onOpen: fn(),
    onAdd: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof MediaFileList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithOneOpen: Story = {
  args: { mediaFiles: twoMediaFiles, currentMediaFileId: "media-1" },
};

export const Adding: Story = {
  args: { mediaFiles: twoMediaFiles, addPending: true },
};
