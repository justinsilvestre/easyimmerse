import { Button } from "../../components/common/Button.tsx";
import { ModalDialog } from "../../components/common/ModalDialog.tsx";
import { SubtitleAppearanceControls } from "../../components/subtitleAppearance/SubtitleAppearanceControls.tsx";
import {
  defaultSubtitleAppearance,
  type SubtitleAppearance,
} from "../../components/subtitleAppearance/subtitleAppearance.ts";

/**
 * The dialog where the user sets how the subtitles over the video look.
 * Each change applies at once, to the preview and to the subtitles behind the dialog.
 */
export function SubtitleAppearanceDialog({
  appearance,
  onChange,
  onClose,
}: {
  appearance: SubtitleAppearance;
  onChange: (appearance: SubtitleAppearance) => void;
  onClose: () => void;
}) {
  return (
    <ModalDialog
      title="Subtitle appearance"
      onCancel={onClose}
      footer={
        <>
          <Button
            variant="subtle"
            onClick={() => onChange(defaultSubtitleAppearance)}
          >
            Restore defaults
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <SubtitleAppearanceControls appearance={appearance} onChange={onChange} />
    </ModalDialog>
  );
}
