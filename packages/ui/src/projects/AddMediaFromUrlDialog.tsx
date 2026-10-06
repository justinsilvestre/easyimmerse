import { useState } from "react";
import { Button } from "../components/Button.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";
import { SelectField } from "../components/SelectField.tsx";
import { TextField } from "../components/TextField.tsx";

/** An installed media-source plugin, as the dialog offers it. */
export type MediaSourceOption = { name: string };

/**
 * Asks for a URL or an id that one of the installed media-source plugins understands,
 * and fetches the media through that plugin. Fetching lasts a while, so the dialog stays
 * open with the fields locked until the caller reports the outcome.
 */
export function AddMediaFromUrlDialog({
  sources,
  isAdding,
  error,
  onAdd,
  onCancel,
}: {
  sources: readonly MediaSourceOption[];
  /** Whether the media is being fetched right now. */
  isAdding: boolean;
  /** Why the last attempt failed, or null. */
  error: string | null;
  onAdd: (source: string, locator: string) => void;
  onCancel: () => void;
}) {
  const [source, setSource] = useState(sources[0]?.name ?? "");
  const [locator, setLocator] = useState("");
  const canAdd = locator.trim() !== "" && source !== "" && !isAdding;
  const add = () => {
    if (canAdd) onAdd(source, locator.trim());
  };
  return (
    <ModalDialog
      title="Add media from a URL"
      description="The media and its subtitles are fetched through an installed plugin."
      onCancel={onCancel}
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" aria-disabled={!canAdd} onClick={add}>
            {isAdding ? "Adding…" : "Add"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        {sources.length > 1 && (
          <SelectField
            label="Source"
            options={sources.map(({ name }) => ({ value: name, label: name }))}
            value={source}
            disabled={isAdding}
            onChange={(event) => setSource(event.target.value)}
          />
        )}
        <TextField
          label="URL or ID"
          placeholder="https://"
          value={locator}
          disabled={isAdding}
          onChange={(event) => setLocator(event.target.value)}
        />
        {isAdding && (
          <p className="text-sm text-fg-muted" role="status">
            Fetching the media. This can take a few minutes.
          </p>
        )}
        {error !== null && (
          <p className="text-sm text-danger-fg" role="alert">
            {error}
          </p>
        )}
      </form>
    </ModalDialog>
  );
}
