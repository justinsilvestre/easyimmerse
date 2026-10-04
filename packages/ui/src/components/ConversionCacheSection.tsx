import type { ConversionCacheStatus } from "@easyimmerse/types";
import { useId } from "react";
import { Button } from "./Button.tsx";
import { formatByteSize } from "./formatByteSize.ts";

/** What is known about the converted videos' disk usage. */
export type ConversionCacheView =
  | { kind: "loading" }
  /** No server, or a server without a conversion service. */
  | { kind: "unavailable" }
  | { kind: "failed"; message: string }
  | { kind: "available"; status: ConversionCacheStatus };

/** What the Settings screen shows about converted videos, and how it clears them. */
export type ConversionCacheControls = {
  cache: ConversionCacheView;
  onClear: () => void;
  /** What the last clearing did, shown beside the button. Empty before any clearing. */
  clearStatus: string;
};

/** Shows the converted videos' disk usage and lets the user clear them. */
export function ConversionCacheSection({
  cache,
  onClear,
  clearStatus,
}: ConversionCacheControls) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-base font-semibold">
        Converted videos
      </h2>
      <CacheBody cache={cache} onClear={onClear} clearStatus={clearStatus} />
    </section>
  );
}

function CacheBody({ cache, onClear, clearStatus }: ConversionCacheControls) {
  switch (cache.kind) {
    case "loading":
      return null;
    case "unavailable":
      return (
        <p className="text-sm text-fg-muted">
          Video conversion is unavailable, so no converted videos are stored.
        </p>
      );
    case "failed":
      return (
        <p role="alert" className="text-sm text-danger-fg">
          The converted videos could not be checked: {cache.message}
        </p>
      );
    case "available":
      return (
        <CacheDetails
          status={cache.status}
          onClear={onClear}
          clearStatus={clearStatus}
        />
      );
  }
}

function CacheDetails({
  status,
  onClear,
  clearStatus,
}: {
  status: ConversionCacheStatus;
  onClear: () => void;
  clearStatus: string;
}) {
  return (
    <>
      <p className="text-sm">{describeUsage(status)}</p>
      <UsageBar
        usageBytes={status.usage_bytes}
        limitBytes={status.limit_bytes}
      />
      {status.space_low && <LowSpaceWarning />}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onClear}>Clear converted videos</Button>
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
  return `Converted videos use ${usage} of ${limit}.`;
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
      aria-label="Disk used by converted videos"
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
      Free space on this disk is low, so fewer converted videos are kept and
      some videos may be converted again. Freeing disk space lets more be kept.
    </p>
  );
}
