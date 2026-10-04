import type { TagDefinition } from "@easyimmerse/types";
import type { ComponentProps } from "react";
import { Badge } from "../components/Badge.tsx";

type Tone = ComponentProps<typeof Badge>["tone"];

/** Badge tones for the tag categories that Yomitan dictionaries use; other categories stay neutral. */
const tonesByCategory: Readonly<Record<string, Tone>> = {
  partOfSpeech: "accent",
  popular: "success",
  frequent: "success",
  archaism: "warning",
  name: "info",
  expression: "info",
};

/** Shows a dictionary's tags as badges colored by category, with each tag's notes as its tooltip. */
export function TagList({ tags }: { tags: readonly TagDefinition[] }) {
  if (tags.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge
          key={tag.name}
          tone={tonesByCategory[tag.category] ?? "neutral"}
          title={tag.notes || undefined}
        >
          {tag.name}
        </Badge>
      ))}
    </span>
  );
}
