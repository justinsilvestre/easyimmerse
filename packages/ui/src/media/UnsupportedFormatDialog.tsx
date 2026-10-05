import { Button } from "../components/Button.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";

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
      title="This browser cannot play the file"
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
        Browsers do not play the format of <strong>{fileName}</strong>. The
        desktop app plays it, converting the file when needed, and opens your
        projects and flashcards as they are here.
      </p>
    </ModalDialog>
  );
}
