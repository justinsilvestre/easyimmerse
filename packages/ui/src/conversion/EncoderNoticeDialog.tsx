import { Button } from "../components/Button.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";

/** Tells the person on the desktop app that converting video needs an ffmpeg build with a software encoder, since the bundled one found none. */
export function EncoderNoticeDialog({
  onOpenSettings,
  onDismiss,
}: {
  onOpenSettings: () => void;
  onDismiss: () => void;
}) {
  return (
    <ModalDialog
      title="Converting video needs another ffmpeg build"
      onCancel={onDismiss}
      footer={
        <>
          <Button onClick={onDismiss}>Not now</Button>
          <Button variant="primary" autoFocus onClick={onOpenSettings}>
            Open Media conversion settings
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-soft">
        Converting unsupported video needs an ffmpeg build with a software H.264
        encoder. This computer has no hardware encoder that the bundled ffmpeg
        can use.
      </p>
      <p className="text-sm text-fg-soft">
        Video that plays directly is not affected. The Media conversion section
        of Settings explains how to install a suitable build and choose it.
      </p>
    </ModalDialog>
  );
}
