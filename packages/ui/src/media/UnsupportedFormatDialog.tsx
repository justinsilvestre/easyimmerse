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
        title="Convert this file to play it?"
        onClose={onClose}
        footer={
          <>
            <Button onClick={onClose}>Not now</Button>
            <Button variant="primary" onClick={onConvert}>
              Convert now
            </Button>
          </>
        }
      >
        <p className="text-sm">
          The player cannot open <strong>{fileName}</strong> in its current
          format. Converting makes a playable copy and leaves the original as it
          is. The copy takes up extra disk space, and you can start the
          conversion later from the project instead.
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
    </Dialog>
  );
}
