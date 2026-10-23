import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { fn } from "storybook/test";
import { exampleInflectedResult } from "../lookup/exampleJapaneseLookup.ts";
import { exampleResults } from "../lookup/exampleLookup.ts";
import { resolveExampleMediaUrl } from "../lookup/exampleMedia.ts";
import type { PageLookupView } from "./createPageLookup.ts";
import { PageLookupPopup } from "./PageLookupPopup.tsx";

const wordRect = { top: 120, bottom: 142, left: 96, right: 156 };

const view: PageLookupView = {
  anchor: wordRect,
  term: "fressen",
  query: { text: "fressen", language: "de" },
  outcome: {
    kind: "answered",
    response: { results: [...exampleResults], kanji: [], stylesheets: [] },
  },
  size: "compact",
};

/** The pop-up over a web page, at a highlighted word of it. */
function PopupOnPage(props: ComponentProps<typeof PageLookupPopup>) {
  return (
    <div className="relative h-dvh bg-white p-4 font-serif text-lg text-gray-900">
      <span
        style={{ position: "fixed", top: wordRect.top, left: wordRect.left }}
        className="rounded-sm bg-amber-200"
      >
        fressen
      </span>
      <PageLookupPopup {...props} />
    </div>
  );
}

const meta = {
  title: "PageLookup/PageLookupPopup",
  component: PopupOnPage,
  parameters: { layout: "fullscreen" },
  args: {
    view,
    resolveMedia: resolveExampleMediaUrl,
    onSearch: fn(),
    onToggleSize: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof PopupOnPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Showing the entries the server's dictionaries have for the word. */
export const EntriesFound: Story = {};

/** Showing entries with images, which the extension fetches from the server. */
export const EntriesWithImages: Story = {
  args: {
    view: {
      ...view,
      term: "食べた",
      outcome: {
        kind: "answered",
        response: {
          results: [exampleInflectedResult],
          kanji: [],
          stylesheets: [],
        },
      },
    },
  },
};

/** Waiting for the server's answer. */
export const LookingUp: Story = {
  args: { view: { ...view, outcome: { kind: "pending" } } },
};

/** The server's dictionaries have no entry for the word. */
export const NoEntry: Story = {
  args: {
    view: {
      ...view,
      outcome: {
        kind: "answered",
        response: { results: [], kanji: [], stylesheets: [] },
      },
    },
  },
};

/** The server could not be reached, or the extension is connected to none. */
export const ServerUnreachable: Story = {
  args: { view: { ...view, outcome: { kind: "failed" } } },
};

/** Enlarged to show more of the entries. */
export const Expanded: Story = {
  args: { view: { ...view, size: "expanded" } },
};

/** In the dark theme, as on a computer set to dark mode, whatever the page's own colors. */
export const DarkSystemTheme: Story = { args: { theme: "dark" } };
