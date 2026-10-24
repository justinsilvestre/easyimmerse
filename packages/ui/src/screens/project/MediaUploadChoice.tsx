import {
  useGetStorageStatusQuery,
  useGetSyncStatusQuery,
} from "@easyimmerse/backend";
import {
  actions,
  selectCloudUrl,
  selectIsStoredCopyFetching,
  selectIsStoredCopyUploading,
  selectIsUploadChoiceChanging,
  selectServerConfig,
  selectServerName,
  selectWorkHome,
  serverNameOf,
} from "@easyimmerse/state";
import type { SyncLink } from "@easyimmerse/types";
import type { ReactNode } from "react";
import { Button } from "../../components/common/Button.tsx";
import { CheckboxField } from "../../components/common/CheckboxField.tsx";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import type { MediaCopy } from "./mediaCopyOf.ts";

type ChoiceProps = { mediaFileId: string; copy: MediaCopy; host: string };

/**
 * Whether a server keeps a copy of a media file, so that it plays on the person's other devices.
 * On the native app linked to a remote, the person chooses whether the remote keeps a copy, and may download the remote's copy of a file this device cannot read.
 * Connected to a server that keeps copies, the person may upload a file this browser holds, and delete the copy again.
 * Otherwise, and for a file at a path on the server the web app is connected to, it shows nothing.
 */
export function MediaUploadChoice({
  mediaFileId,
  copy,
}: {
  mediaFileId: string;
  copy: MediaCopy;
}) {
  const workHome = useAppSelector(selectWorkHome);
  const server = useAppSelector(selectServerConfig);
  const cloudUrl = useAppSelector(selectCloudUrl);
  const link = useGetSyncStatusQuery(undefined, {
    skip: workHome !== "builtInServer",
  }).data?.link;
  const storage = useGetStorageStatusQuery("self", {
    skip: workHome !== "accountServer" || copy.browserFile === null,
  }).data;
  if (workHome === "builtInServer")
    return link ? (
      <RemoteCopyChoice mediaFileId={mediaFileId} copy={copy} link={link} />
    ) : null;
  const keepsCopies = storage !== undefined && storage.quota_bytes !== 0;
  if (server === null || copy.browserFile === null) return null;
  if (!keepsCopies && !copy.hasStoredCopy) return null;
  return (
    <BrowserFileUpload
      mediaFileId={mediaFileId}
      copy={copy}
      host={serverNameOf(server.serverUrl, cloudUrl)}
    />
  );
}

function RemoteCopyChoice({
  mediaFileId,
  copy,
  link,
}: {
  mediaFileId: string;
  copy: MediaCopy;
  link: SyncLink;
}) {
  const dispatch = useAppDispatch();
  const host = useAppSelector((state) =>
    selectServerName(state, link.server_url),
  );
  const isChanging = useAppSelector((state) =>
    selectIsUploadChoiceChanging(state, mediaFileId),
  );
  const transfer =
    link.transfer?.media_file_id === mediaFileId ? link.transfer : null;
  const canDownload =
    copy.isUploadChosen && copy.isUnreadableHere && !copy.hasStoredCopy;
  return (
    <ChoiceRow>
      <CheckboxField
        label={`Keep a copy on ${host}`}
        checked={copy.isUploadChosen}
        disabled={isChanging}
        onChange={(event) =>
          dispatch(
            actions.uploadChoiceToggled(
              copy.projectId,
              mediaFileId,
              event.target.checked,
            ),
          )
        }
      />
      {transfer && (
        <span role="status" className="text-xs text-fg-muted">
          Uploading… {percentOf(transfer.sent_bytes, transfer.total_bytes)}%
        </span>
      )}
      {canDownload && (
        <DownloadButton mediaFileId={mediaFileId} copy={copy} host={host} />
      )}
    </ChoiceRow>
  );
}

function DownloadButton({ mediaFileId, copy, host }: ChoiceProps) {
  const dispatch = useAppDispatch();
  const isFetching = useAppSelector((state) =>
    selectIsStoredCopyFetching(state, mediaFileId),
  );
  return (
    <Button
      size="sm"
      aria-disabled={isFetching || undefined}
      onClick={() => {
        if (!isFetching)
          dispatch(
            actions.storedCopyFetchRequested(copy.projectId, mediaFileId),
          );
      }}
    >
      {isFetching ? "Downloading…" : `Download from ${host}`}
    </Button>
  );
}

function BrowserFileUpload({ mediaFileId, copy, host }: ChoiceProps) {
  const dispatch = useAppDispatch();
  const isRemoving = useAppSelector((state) =>
    selectIsUploadChoiceChanging(state, mediaFileId),
  );
  if (copy.hasStoredCopy)
    return (
      <ChoiceRow>
        <span className="text-xs text-fg-muted">Kept on {host}</span>
        <Button
          size="sm"
          aria-label={`${isRemoving ? "Removing" : "Remove"} from ${host}`}
          aria-disabled={isRemoving || undefined}
          onClick={() => {
            if (!isRemoving)
              dispatch(
                actions.uploadChoiceToggled(copy.projectId, mediaFileId, false),
              );
          }}
        >
          {isRemoving ? "Removing…" : "Remove"}
        </Button>
      </ChoiceRow>
    );
  return <UploadButton mediaFileId={mediaFileId} copy={copy} host={host} />;
}

function UploadButton({ mediaFileId, copy, host }: ChoiceProps) {
  const dispatch = useAppDispatch();
  const isUploading = useAppSelector((state) =>
    selectIsStoredCopyUploading(state, mediaFileId),
  );
  const isGone = copy.browserFile === "gone";
  return (
    <ChoiceRow>
      <Button
        size="sm"
        aria-disabled={isUploading || isGone || undefined}
        aria-describedby={isGone ? `${mediaFileId}-upload-hint` : undefined}
        onClick={() => {
          if (!isUploading && !isGone)
            dispatch(
              actions.storedCopyUploadRequested(copy.projectId, mediaFileId),
            );
        }}
      >
        {isUploading ? "Uploading…" : `Upload to ${host}`}
      </Button>
      {isGone && (
        <span
          id={`${mediaFileId}-upload-hint`}
          className="text-xs text-fg-muted"
        >
          This file is no longer open in the browser. Add it again to upload it.
        </span>
      )}
    </ChoiceRow>
  );
}

function ChoiceRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pb-2">
      {children}
    </div>
  );
}

function percentOf(sent: number, total: number): number {
  return total === 0 ? 0 : Math.floor((sent / total) * 100);
}
