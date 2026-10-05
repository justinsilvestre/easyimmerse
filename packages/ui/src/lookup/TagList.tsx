import type { TagDefinition } from "@easyimmerse/types";
import clsx from "clsx";
import type { ComponentProps } from "react";
import { Badge } from "../components/Badge.tsx";
import { yomitanClassName } from "./definition/yomitanClassName.ts";

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

/**
 * Shows a dictionary's tags as badges colored by category, with each tag's notes as its tooltip.
 * Each tag sits in the elements Yomitan renders for a tag, `tag` > `tag-label` > `tag-label-content`, with its category in `data-category`, so that dictionary stylesheets written for Yomitan can restyle it.
 */
export function TagList({ tags }: { tags: readonly TagDefinition[] }) {
  if (tags.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag.name}
          className={clsx(yomitanClassName("tag"), "inline-flex")}
          data-category={tag.category || undefined}
        >
          <Badge
            tone={tonesByCategory[tag.category] ?? "neutral"}
            title={tag.notes || undefined}
            className={yomitanClassName("tag-label")}
          >
            <span className={yomitanClassName("tag-label-content")}>
              {tag.name}
            </span>
          </Badge>
        </span>
      ))}
    </span>
  );
}
