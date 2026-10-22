import { ModalDialog } from "../components/ModalDialog.tsx";

/** Shows a card's screenshot as large as the screen allows, over the review. */
export function ScreenshotDialog({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  return (
    <ModalDialog title="Screenshot" onCancel={onClose} isWide>
      <img
        src={url}
        alt="Screenshot from the video, at full size"
        className="max-h-[calc(100dvh-10rem)] w-full rounded-md object-contain"
      />
    </ModalDialog>
  );
}
