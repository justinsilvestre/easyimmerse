import type { BackupSign, SyncPlace } from "@easyimmerse/state";
import { type MouseEvent, type RefObject, useId } from "react";
import { Button } from "../components/common/Button.tsx";
import { useAppDispatch } from "../useAppDispatch.ts";
import { backupSignTexts, type SyncMenuOption } from "./backupSignTexts.ts";
import { syncMenuOptions } from "./syncMenuOptions.ts";

/**
 * The Sync menu's open popover, above the footer: the status line, with what is wrong and its fix when something is,
 * then the buttons that would keep the work elsewhere.
 */
export function SyncMenuPanel({
  status,
  place,
  sign,
  close,
  ...popupProps
}: {
  ref: RefObject<HTMLDivElement | null>;
  id: string;
  onMouseDown: (event: MouseEvent) => void;
  close: () => void;
  status: string;
  place: SyncPlace;
  sign: BackupSign;
}) {
  const texts = backupSignTexts(sign);
  const options = syncMenuOptions(place);
  const statusId = useId();
  const dispatch = useAppDispatch();
  const choose = (option: SyncMenuOption) => {
    close();
    for (const action of option.actions) dispatch(action);
  };
  return (
    <div
      {...popupProps}
      role="dialog"
      aria-labelledby={statusId}
      className="absolute bottom-full left-0 z-20 mb-1 flex w-72 max-w-[calc(100vw-1rem)] flex-col gap-3 rounded-md border border-line bg-surface p-3 text-sm shadow-lg max-sm:left-2"
    >
      <div className="flex flex-col gap-2">
        <p id={statusId} className="font-medium">
          {status}
        </p>
        {texts !== null && <p className="text-fg-muted">{texts.explanation}</p>}
        {texts?.fix && (
          <OptionButtons options={[texts.fix]} onChoose={choose} />
        )}
      </div>
      {options.length > 0 && (
        <div className="border-t border-line pt-3">
          <OptionButtons options={options} onChoose={choose} />
        </div>
      )}
    </div>
  );
}

function OptionButtons({
  options,
  onChoose,
}: {
  options: readonly SyncMenuOption[];
  onChoose: (option: SyncMenuOption) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button key={option.label} size="sm" onClick={() => onChoose(option)}>
          {option.label}
        </Button>
      ))}
    </div>
  );
}
