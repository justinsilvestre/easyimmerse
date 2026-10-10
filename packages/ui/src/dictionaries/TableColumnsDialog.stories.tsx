import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TableColumnsDialog } from "./TableColumnsDialog.tsx";

const meta = {
  title: "Dictionaries/TableColumnsDialog",
  component: TableColumnsDialog,
  parameters: { layout: "fullscreen" },
  args: {
    fileName: "animals.csv",
    preview: {
      layout: { columns: ["term", "reading", "definition"], hasHeader: false },
      rows: [
        ["猫", "ねこ", "cat; a small furry pet that purrs"],
        ["犬", "いぬ", "dog"],
        ["鳥", "とり", "bird"],
        ["魚", "さかな", "fish"],
        ["馬", "うま", "horse"],
      ],
    },
    layout: { columns: ["term", "reading", "definition"], hasHeader: false },
    hint: null,
    onColumnRoleChosen: fn(),
    onHeaderRowToggled: fn(),
    onImport: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof TableColumnsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const JapaneseWithoutHeader: Story = {};

export const GermanWithHeader: Story = {
  args: {
    fileName: "wortschatz.csv",
    preview: {
      layout: { columns: ["term", "definition"], hasHeader: false },
      rows: [
        ["Wort", "Bedeutung"],
        ["Hund", "dog"],
        ["Katze", "cat"],
        ["anrufen", "to call (on the phone); separable: ich rufe dich an"],
        ["Haus", "house"],
      ],
    },
    layout: { columns: ["term", "definition"], hasHeader: true },
  },
};

export const WideTable: Story = {
  args: {
    fileName: "vocabulary.tsv",
    preview: {
      layout: {
        columns: [
          "term",
          "reading",
          "definition",
          "alternates",
          "tags",
          "frequency",
          "ignored",
        ],
        hasHeader: true,
      },
      rows: [
        ["term", "reading", "meaning", "forms", "pos", "rank", "deck"],
        ["食べる", "たべる", "to eat", "喰べる", "v1", "312", "Core 2k"],
        ["飲む", "のむ", "to drink", "呑む", "v5m", "540", "Core 2k"],
      ],
    },
    layout: {
      columns: [
        "term",
        "reading",
        "definition",
        "alternates",
        "tags",
        "frequency",
        "ignored",
      ],
      hasHeader: true,
    },
  },
};

export const WithoutTerm: Story = {
  args: {
    preview: {
      layout: { columns: ["definition", "definition"], hasHeader: false },
      rows: [
        ["a small furry pet", "Old English catt"],
        ["a loyal pet", "Old English docga"],
      ],
    },
    layout: { columns: ["definition", "definition"], hasHeader: false },
    hint: "Choose the column that holds the term.",
  },
};
