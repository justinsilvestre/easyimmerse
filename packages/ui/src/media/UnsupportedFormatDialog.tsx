import { Button } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";

/** Tells the user a media file cannot be played as it is, and what can be done about it on this platform. */
export function UnsupportedFormatDialog({
  fileName,
  platform,
  onConvert,
  onLearnAboutDesktopApp,
  onClose,
}: {
  fileName: string;
  platform: "desktop" | "web";
  onConvert: () => void;
  onLearnAboutDesktopApp: () => void;
  onClose: () => void;
}) {
  if (platform === "desktop") {
    return (
      <Dialog
        title="Convert this file?"
        onClose={onClose}
        footer={
          <>
            <Button onClick={onClose}>Not now</Button>
            <Button variant="primary" onClick={onConvert}>
              Convert
            </Button>
          </>
        }
      >
        <p className="text-sm">
          <strong>{fileName}</strong> is in a format the player cannot play as
          it is. The app can convert it to a supported format. The original file
          is kept, and the converted copy uses extra disk space.
        </p>
      </Dialog>
    );
  }
  return (
    <Dialog
      title="This browser cannot play the file"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={onLearnAboutDesktopApp}>
            About the desktop app
          </Button>
        </>
      }
    >
      <p className="text-sm">
        <strong>{fileName}</strong> is in a format browsers do not play. The
        easyImmerse desktop app plays it, and converts files when needed. Your
        projects and flashcards carry over.
      </p>
    </Dialog>
  );
}
