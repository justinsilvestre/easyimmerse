import type { MediaDescription, MediaSourceJob } from "@easyimmerse/types";
import clsx from "clsx";
import { useState } from "react";
import { Button } from "../components/Button.tsx";
import { formatPlayerTime } from "../components/formatPlayerTime.ts";
import { ModalDialog } from "../components/ModalDialog.tsx";
import { SelectField } from "../components/SelectField.tsx";
import { TextField } from "../components/TextField.tsx";
import { FetchLog } from "./FetchLog.tsx";
import { SourceSubtitlesChoice } from "./SourceSubtitlesChoice.tsx";
import {
  defaultSubtitleChoice,
  type ProjectLanguages,
} from "./sourceSubtitleDefaults.ts";

/** An installed media-source plugin, as the dialog offers it. */
export type MediaSourceOption = { name: string };

/** What the plugin answered when asked about the typed locator, or why it could not. */
export type MediaLookup = {
  isLooking: boolean;
  description: MediaDescription | null;
  error: string | null;
};

/**
 * Asks for a URL or an id that one of the installed media-source plugins understands,
 * looks it up through that plugin, lets the user choose among the subtitle tracks the
 * source offers, and fetches the media with them. Fetching lasts a while, so the dialog
 * stays open with the fields locked, showing the fetch's progress and what the plugin
 * reports, until the caller reports the outcome. A failed fetch leaves its log open to read.
 */
export function AddMediaFromUrlDialog({
  sources,
  languages,
  lookup,
  isStarting,
  job,
  error,
  onLookUp,
  onAdd,
  onCancel,
}: {
  sources: readonly MediaSourceOption[];
  languages: ProjectLanguages;
  lookup: MediaLookup;
  /** Whether the fetch is being started, before there is a job to watch. */
  isStarting: boolean;
  /** The fetch being watched, or null before one starts. */
  job: MediaSourceJob | null;
  /** Why the fetch could not be started, or null. */
  error: string | null;
  onLookUp: (source: string, locator: string) => void;
  onAdd: (source: string, locator: string, subtitles: string[]) => void;
  onCancel: () => void;
}) {
  const [source, setSource] = useState(sources[0]?.name ?? "");
  const [locator, setLocator] = useState("");
  const [lookedUp, setLookedUp] = useState<[string, string] | null>(null);
  const [choice, setChoice] = useState<SubtitleChoice | null>(null);
  const trimmed = locator.trim();
  const isRunning = isStarting || job?.status === "running";
  // What the plugin answered applies only while the fields still say what was looked up.
  const isCurrent = lookedUp?.[0] === source && lookedUp[1] === trimmed;
  const description = isCurrent ? lookup.description : null;
  const selectedIds =
    choice?.description === description
      ? choice.ids
      : description
        ? defaultSubtitleChoice(description.subtitles, languages)
        : [];
  const canLookUp =
    trimmed !== "" && source !== "" && !lookup.isLooking && !isRunning;
  const canAdd = description !== null && !isRunning;
  const failure =
    error ??
    (job?.status === "failed"
      ? (job.error?.message ?? "The media could not be added.")
      : isCurrent
        ? lookup.error
        : null);
  const lookUp = () => {
    if (!canLookUp) return;
    setLookedUp([source, trimmed]);
    onLookUp(source, trimmed);
  };
  const add = () => {
    if (canAdd) onAdd(source, trimmed, [...selectedIds]);
  };
  const toggle = (id: string, isSelected: boolean) => {
    if (description === null) return;
    const ids = isSelected
      ? [...selectedIds, id]
      : selectedIds.filter((selected) => selected !== id);
    setChoice({ description, ids });
  };
  return (
    <ModalDialog
      title="Add media from a URL"
      description="The media and its subtitles are fetched through an installed plugin."
      onCancel={onCancel}
      footer={
        <>
          <Button onClick={onCancel}>{isRunning ? "Close" : "Cancel"}</Button>
          {description === null ? (
            <Button
              variant="primary"
              aria-disabled={!canLookUp}
              onClick={lookUp}
            >
              {lookup.isLooking ? "Looking up…" : "Look up"}
            </Button>
          ) : (
            <Button variant="primary" aria-disabled={!canAdd} onClick={add}>
              {isRunning ? "Adding…" : "Add"}
            </Button>
          )}
        </>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (description === null) lookUp();
          else add();
        }}
      >
        {sources.length > 1 && (
          <SelectField
            label="Source"
            options={sources.map(({ name }) => ({ value: name, label: name }))}
            value={source}
            disabled={isRunning}
            onChange={(event) => setSource(event.target.value)}
          />
        )}
        <TextField
          label="URL or ID"
          placeholder="https://"
          value={locator}
          disabled={isRunning}
          onChange={(event) => setLocator(event.target.value)}
        />
        {lookup.isLooking && isCurrent && (
          <p className="text-sm text-fg-muted" role="status">
            Asking the source about the media…
          </p>
        )}
        {description && (
          <>
            <DescriptionSummary description={description} />
            <SourceSubtitlesChoice
              subtitles={description.subtitles}
              selectedIds={selectedIds}
              disabled={isRunning}
              onToggle={toggle}
            />
          </>
        )}
        {job && <FetchProgress job={job} />}
        {failure !== null && (
          <p className="text-sm text-danger-fg" role="alert">
            {failure}
          </p>
        )}
      </form>
    </ModalDialog>
  );
}

/** The user's own choice of subtitle tracks, for the description it was made for. */
type SubtitleChoice = {
  description: MediaDescription;
  ids: readonly string[];
};

/** The media's title and duration, as the plugin reported them. */
function DescriptionSummary({
  description,
}: {
  description: MediaDescription;
}) {
  return (
    <p className="text-sm">
      <span className="font-medium">{description.title}</span>
      {description.duration_ms !== null && (
        <span className="text-fg-muted">
          {" · "}
          {formatPlayerTime(description.duration_ms / 1000)}
        </span>
      )}
    </p>
  );
}

/** The fetch's progress bar, its latest step, and the log of what the plugin reported. */
function FetchProgress({ job }: { job: MediaSourceJob }) {
  const fraction = job.progress?.fraction ?? null;
  const message =
    job.status === "running"
      ? (job.progress?.message ?? "Starting the fetch")
      : job.status === "done"
        ? "Done"
        : "Failed";
  return (
    <div className="flex flex-col gap-2">
      <ProgressBar fraction={job.status === "done" ? 1 : fraction} />
      <p className="text-sm text-fg-muted" role="status">
        {message}
        {job.status === "running" && ". This can take a few minutes."}
      </p>
      <details open={job.status === "failed"} className="text-xs">
        <summary className="cursor-pointer text-fg-muted">Log</summary>
        <FetchLog lines={job.log} />
      </details>
    </div>
  );
}

/** A bar filled to `fraction`, or pulsing while the fraction is still unknown. */
function ProgressBar({ fraction }: { fraction: number | null }) {
  const percent = fraction === null ? null : Math.round(fraction * 100);
  return (
    <div
      role="progressbar"
      aria-label="Fetch progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? undefined}
      className="h-1.5 w-full overflow-hidden rounded bg-surface-muted"
    >
      <div
        className={clsx(
          "h-full bg-accent transition-[width]",
          percent === null && "animate-pulse",
        )}
        style={{ width: `${percent ?? 100}%` }}
      />
    </div>
  );
}
