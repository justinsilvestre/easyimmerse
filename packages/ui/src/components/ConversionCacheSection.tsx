import type { ConversionCacheStatus } from "@easyimmerse/types";
import { useId } from "react";
import { Button } from "./Button.tsx";
import { formatByteSize } from "./formatByteSize.ts";
import { SelectField } from "./SelectField.tsx";

/** What is known about the media cache's disk usage. */
export type ConversionCacheView =
  | { kind: "loading" }
  /** No server, or a server without a conversion service. */
  | { kind: "unavailable" }
  | { kind: "failed"; message: string }
  | { kind: "available"; status: ConversionCacheStatus };

/** What the Settings screen shows about the media cache, and how it clears it and sets its size. */
export type ConversionCacheControls = {
  cache: ConversionCacheView;
  onClear: () => void;
  /** What the last clearing did, shown beside the button. Empty before any clearing. */
  clearStatus: string;
  /** Sets how large the cache may grow, or null to let it follow the disk's size. */
  onBudgetChange: (budgetBytes: number | null) => void;
};

const gigabyte = 1_000_000_000;

/** The sizes the cache may be limited to, besides following the disk. */
const budgetChoicesGb = [1, 2, 5, 10, 20, 50, 100];

/** Shows the media cache's disk usage, lets the user set its size and clear it. */
export function ConversionCacheSection(controls: ConversionCacheControls) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-base font-semibold">
        Media cache
      </h2>
      <p className="text-sm text-fg-muted">
        When the app processes media (video, audio, subtitles, and so on) for
        compatibility reasons, the processed files are kept in a cache on disk,
        so that they play at once the next time. You can clear the cache to free
        up space.
      </p>
      <CacheBody {...controls} />
    </section>
  );
}

function CacheBody(controls: ConversionCacheControls) {
  const { cache } = controls;
  switch (cache.kind) {
    case "loading":
      return null;
    case "unavailable":
      return (
        <p className="text-sm text-fg-muted">
          Media conversion is unavailable, so there is no cache.
        </p>
      );
    case "failed":
      return (
        <p role="alert" className="text-sm text-danger-fg">
          The media cache could not be checked: {cache.message}
        </p>
      );
    case "available":
      return <CacheDetails {...controls} status={cache.status} />;
  }
}

function CacheDetails({
  status,
  onClear,
  clearStatus,
  onBudgetChange,
}: Omit<ConversionCacheControls, "cache"> & {
  status: ConversionCacheStatus;
}) {
  return (
    <>
      <p className="text-sm">{describeUsage(status)}</p>
      <UsageBar
        usageBytes={status.usage_bytes}
        limitBytes={status.limit_bytes}
      />
      {status.space_low && <LowSpaceWarning />}
      <SelectField
        label="Maximum size"
        className="max-w-xs"
        value={status.chosen_budget_bytes?.toString() ?? "auto"}
        options={[
          { value: "auto", label: "Automatic (5% of the disk)" },
          ...budgetChoicesGb.map((gb) => ({
            value: String(gb * gigabyte),
            label: `${gb} GB`,
          })),
        ]}
        onChange={(event) =>
          onBudgetChange(
            event.target.value === "auto" ? null : Number(event.target.value),
          )
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onClear}>Clear media cache</Button>
        <p role="status" className="text-sm text-fg-muted">
          {clearStatus}
        </p>
      </div>
    </>
  );
}

function describeUsage(status: ConversionCacheStatus): string {
  const usage = formatByteSize(status.usage_bytes);
  const limit = formatByteSize(status.limit_bytes);
  return `The cache is using ${usage} of ${limit}.`;
}

function UsageBar({
  usageBytes,
  limitBytes,
}: {
  usageBytes: number;
  limitBytes: number;
}) {
  return (
    <meter
      aria-label="Disk used by the media cache"
      min={0}
      max={Math.max(limitBytes, 1)}
      value={usageBytes}
      className="h-2 w-full appearance-none overflow-hidden rounded-full bg-surface-strong [&::-moz-meter-bar]:bg-accent [&::-webkit-meter-bar]:rounded-full [&::-webkit-meter-bar]:border-0 [&::-webkit-meter-bar]:bg-surface-strong [&::-webkit-meter-optimum-value]:bg-accent"
    />
  );
}

function LowSpaceWarning() {
  return (
    <p
      role="note"
      className="rounded border border-warning-line bg-warning-soft px-3 py-2 text-sm text-warning-fg"
    >
      Free space on this disk is low, so fewer processed files are kept and some
      media may be processed again. Freeing disk space lets more be kept.
    </p>
  );
}
