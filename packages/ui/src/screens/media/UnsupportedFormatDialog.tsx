import { Button } from "../../components/common/Button.tsx";
import { ModalDialog } from "../../components/common/ModalDialog.tsx";

/** Tells the user that the browser cannot play a media file, and that the desktop app can. */
export function UnsupportedFormatDialog({
  fileName,
  onLearnAboutDesktopApp,
  onClose,
}: {
  fileName: string;
  onLearnAboutDesktopApp: () => void;
  onClose: () => void;
}) {
  return (
    <ModalDialog
      title="Your browser can't play this file"
      onCancel={onClose}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={onLearnAboutDesktopApp}>
            Get the desktop app
          </Button>
        </>
      }
    >
      <p className="text-sm">
        Browsers don't support the format of <strong>{fileName}</strong>, but
        the desktop app can play it. Your projects and flashcards will be
        there too.
      </p>
    </ModalDialog>
  );
}
