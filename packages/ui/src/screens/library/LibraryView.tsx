import { type LibraryBrowseFilter, pathOfRoute } from "@easyimmerse/state";
import type { LibraryItem } from "@easyimmerse/types";
import clsx from "clsx";
import { Library, Settings2 } from "lucide-react";
import { ButtonLink } from "../../components/common/Button.tsx";
import { EmptyState } from "../../components/common/EmptyState.tsx";
import { LoadingStatus, Skeleton } from "../../components/common/Skeleton.tsx";
import { LibraryItemCard } from "../../components/libraryItemCard/LibraryItemCard.tsx";
import { ScreenLayout } from "../../layout/ScreenLayout.tsx";
import { languageName } from "../../lib/formatting/languages.ts";
import type { LibraryListStatus } from "../../lib/library/LibraryListStatus.ts";

/**
 * The library: the language its learners study, a button for each tag that turns it on and off, and the items the filter keeps.
 * A library manager also sees each item's status and a "Manage library" button.
 */
export function LibraryView({
  status,
  language,
  items,
  tags,
  filter,
  canManage,
  coverUrlOf,
  onToggleTag,
}: {
  status: LibraryListStatus;
  /** The library's language, or null while no library manager has set it. */
  language: string | null;
  /** The items the filter keeps. */
  items: readonly LibraryItem[];
  /** The tags of every item, each with its button. */
  tags: readonly string[];
  filter: LibraryBrowseFilter;
  canManage: boolean;
  coverUrlOf: (item: LibraryItem) => string | null;
  onToggleTag: (tag: string) => void;
}) {
  return (
    <ScreenLayout
      backHref={pathOfRoute({ screen: "home" })}
      backLabel="Projects"
      wide
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Library</h1>
          {language !== null && (
            <p className="text-sm text-fg-muted">
              For learners of {languageName(language)}.
            </p>
          )}
        </div>
        {canManage && (
          <ButtonLink href={pathOfRoute({ screen: "libraryManage" })}>
            <Settings2 className="size-4" aria-hidden />
            Manage library
          </ButtonLink>
        )}
      </div>
      {status === "ready" && tags.length > 0 && (
        <TagChips tags={tags} chosen={filter.tags} onToggle={onToggleTag} />
      )}
      <Items
        status={status}
        items={items}
        canManage={canManage}
        coverUrlOf={coverUrlOf}
        isFiltered={filter.tags.length > 0}
      />
    </ScreenLayout>
  );
}

function TagChips({
  tags,
  chosen,
  onToggle,
}: {
  tags: readonly string[];
  chosen: readonly string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="mb-1 text-sm font-medium">Tags</legend>
      {tags.map((tag) => {
        const isOn = chosen.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={isOn}
            onClick={() => onToggle(tag)}
            className={clsx(
              "rounded-full border px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              isOn
                ? "border-accent bg-accent-soft text-accent-fg"
                : "border-line-strong bg-surface text-fg-muted hover:bg-surface-muted",
            )}
          >
            {tag}
          </button>
        );
      })}
    </fieldset>
  );
}

function Items({
  status,
  items,
  canManage,
  coverUrlOf,
  isFiltered,
}: {
  status: LibraryListStatus;
  items: readonly LibraryItem[];
  canManage: boolean;
  coverUrlOf: (item: LibraryItem) => string | null;
  isFiltered: boolean;
}) {
  switch (status) {
    case "loading":
      return (
        <LoadingStatus
          label="Loading the library"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Skeleton className="aspect-[4/3] rounded-lg" />
          <Skeleton className="aspect-[4/3] rounded-lg" />
          <Skeleton className="aspect-[4/3] rounded-lg" />
        </LoadingStatus>
      );
    case "failed":
      return (
        <p role="alert">
          The library couldn't be loaded. Try again in a moment.
        </p>
      );
    case "ready":
      if (items.length === 0)
        return (
          <EmptyState
            icon={<Library className="size-8" />}
            title={isFiltered ? "Nothing matches" : "The library is empty"}
            description={
              isFiltered
                ? "Nothing in the library has every tag chosen."
                : "Nothing has been added to this server's library yet."
            }
          />
        );
      return (
        <ul
          aria-label="Library items"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((item) => (
            <li key={item.id} className="flex">
              <LibraryItemCard
                item={item}
                coverUrl={coverUrlOf(item)}
                showsStatus={canManage}
                href={pathOfRoute({ screen: "libraryItem", itemId: item.id })}
              />
            </li>
          ))}
        </ul>
      );
  }
}
