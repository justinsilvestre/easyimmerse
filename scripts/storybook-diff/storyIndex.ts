import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** One story from a built Storybook's index. */
export interface StoryEntry {
  id: string;
  title: string;
  name: string;
  importPath: string;
}

/** The shape of a built Storybook's `index.json` that this tool reads. */
export interface StoryIndexFile {
  v: number;
  entries: Record<string, StoryIndexEntry>;
}

interface StoryIndexEntry extends StoryEntry {
  type: string;
}

/** Reads the stories from a built Storybook, leaving out its docs pages. */
export async function readStoryIndex(
  storybookDir: string,
): Promise<StoryEntry[]> {
  const text = await readFile(join(storybookDir, "index.json"), "utf8");
  return listStories(JSON.parse(text));
}

/** Lists the story entries of a parsed index in the index's order. */
export function listStories(index: StoryIndexFile): StoryEntry[] {
  if (index.v !== 5) {
    throw new Error(`Unsupported Storybook index version ${index.v}.`);
  }
  return Object.values(index.entries)
    .filter((entry) => entry.type === "story")
    .map(({ id, title, name, importPath }) => ({
      id,
      title,
      name,
      importPath,
    }));
}
