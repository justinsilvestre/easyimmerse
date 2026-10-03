import { useId } from "react";
import { Button } from "./Button.tsx";
import { formatByteSize } from "./formatByteSize.ts";

/**
 * How much disk the converted videos take and may take.
 * Stands in for the server's cache status type until it is generated from Rust.
 */
export type ConversionCacheStatus = {
  usageBytes: number;
  limitBytes: number;
  budgetBytes: number;
  freeBytes: number;
  /** True when the free-space reserve, not the budget, limits the cache. */
  spaceLow: boolean;
};

/** Shows the converted videos' disk usage and lets the user clear them. A null status means conversion is unavailable. */
export function ConversionCacheSection({
  status,
  onClear,
  clearStatus,
}: {
  status: ConversionCacheStatus | null;
  onClear: () => void;
  /** What the last clearing did, shown beside the button. Empty before any clearing. */
  clearStatus: string;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-base font-semibold">
        Converted videos
      </h2>
      {status === null ? (
        <p className="text-sm text-fg-muted">
          Video conversion is unavailable, so no converted videos are stored.
        </p>
      ) : (
        <CacheDetails
          status={status}
          onClear={onClear}
          clearStatus={clearStatus}
        />
      )}
    </section>
  );
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
      <UsageBar usageBytes={status.usageBytes} limitBytes={status.limitBytes} />
      {status.spaceLow && <LowSpaceWarning />}
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
  const usage = formatByteSize(status.usageBytes);
  const limit = formatByteSize(status.limitBytes);
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
