import type { LibraryItem, Project } from "@easyimmerse/types";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { SelectField } from "../components/SelectField.tsx";
import { languageName } from "../projects/languages.ts";
import {
  formatLibraryDuration,
  libraryDifficultyLabels,
  libraryKindLabels,
} from "./libraryLabels.ts";

/** The value of the "Add to" choice that creates a project for the item. */
const newProject = "";

/**
 * One item of the library: its cover, full description and details, and the way to add it to one of the person's projects
 * in its language or to a new project made for it. A library manager also gets an Edit button.
 */
export function LibraryItemView({
  item,
  coverUrl,
  projects,
  canManage,
  isAdding,
  addFailure,
  onAdd,
  onEdit,
  onBack,
}: {
  item: LibraryItem;
  coverUrl: string | null;
  /** The person's projects in the item's language, which it can be added to. */
  projects: readonly Project[];
  canManage: boolean;
  isAdding: boolean;
  /** Why the item could not be added, or null. */
  addFailure: string | null;
  /** Adds the item to the project with the given id, or to a new project for null. */
  onAdd: (projectId: string | null) => void;
  onEdit: () => void;
  onBack: () => void;
}) {
  const [chosen, setChosen] = useState(projects[0]?.id ?? newProject);
  return (
    <ScreenLayout onBack={onBack} backLabel="Library">
      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          className="aspect-video w-full rounded-lg object-cover"
        />
      )}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-xl font-semibold">{item.title}</h1>
          {canManage && (
            <Button onClick={onEdit}>
              <Pencil className="size-4" aria-hidden />
              Edit
            </Button>
          )}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
          <span>{libraryKindLabels[item.kind]}</span>
          <span>{languageName(item.language)}</span>
          {item.duration_ms !== null && (
            <span>{formatLibraryDuration(item.duration_ms)}</span>
          )}
          {item.difficulty && (
            <Badge tone="accent">
              {libraryDifficultyLabels[item.difficulty]}
            </Badge>
          )}
          {item.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </p>
        {item.description && (
          <p className="whitespace-pre-line">{item.description}</p>
        )}
      </div>
      <form
        aria-label="Add to project"
        className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isAdding) onAdd(chosen === newProject ? null : chosen);
        }}
      >
        <SelectField
          label="Add to"
          className="flex-1"
          value={chosen}
          options={[
            ...projects.map((project) => ({
              value: project.id,
              label: project.settings.name,
            })),
            {
              value: newProject,
              label: `New ${languageName(item.language)} project`,
            },
          ]}
          onChange={(event) => setChosen(event.target.value)}
        />
        <Button
          type="submit"
          variant="primary"
          aria-disabled={isAdding || undefined}
        >
          <Plus className="size-4" aria-hidden />
          {isAdding ? "Adding…" : "Add to project"}
        </Button>
      </form>
      {addFailure && (
        <p role="alert" className="text-sm text-danger-fg">
          {addFailure}
        </p>
      )}
    </ScreenLayout>
  );
}
