import { Button } from "../components/Button.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";

/** The AnkiConnect add-on's code, which Anki's add-on dialog installs it by. */
const ankiConnectCode = "2055492159";

/** Explains what sending cards to Anki needs, and lets the user start sending this project's cards there. */
export function AnkiConnectSetupDialog({
  onConnect,
  onClose,
}: {
  onConnect: () => void;
  onClose: () => void;
}) {
  return (
    <ModalDialog
      title="Set up AnkiConnect"
      description="Send cards straight to Anki on this computer while it runs."
      onCancel={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" autoFocus onClick={onConnect}>
            Connect to Anki
          </Button>
        </>
      }
    >
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
        <li>Install Anki for desktop, version 23.10 or later.</li>
        <li>
          In Anki, choose Tools, then Add-ons, then Get Add-ons, and enter the
          code <code className="font-mono">{ankiConnectCode}</code> to install
          AnkiConnect. Restart Anki.
        </li>
        <li>Keep Anki open while you send cards.</li>
        <li>
          The first time, Anki asks whether to let easyImmerse use it. Choose
          Yes.
        </li>
      </ol>
      <p className="text-sm text-fg-muted">
        New cards are sent as soon as they are saved. Cards that could not be
        sent wait until you send them.
      </p>
    </ModalDialog>
  );
}
