import { Button } from "../components/Button.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";

/** The code by which Anki's add-on dialog installs AnkiConnect. */
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
      description="Use the AnkiConnect add-on for the Anki desktop app and send cards straight from easyImmerse to Anki as you make them."
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
      <p className="text-sm">
        Requires{" "}
        <a
          href="https://apps.ankiweb.net/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Anki for desktop
        </a>
        , version 23.10 or later.
      </p>
      <p className="text-sm">
        In order to <b>install AnkiConnect</b>:
      </p>
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
        <li>In Anki, choose Tools &gt; Add-ons &gt; Get Add-ons.</li>
        <li>
          Enter the code <code className="font-mono">{ankiConnectCode}</code> to
          install AnkiConnect.
        </li>
        <li>Restart Anki.</li>
      </ol>
      <p className="text-sm">
        Once you've got AnkiConnect installed,{" "}
        <strong>allow easyImmerse to connect to Anki</strong>:
      </p>

      <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
        <li>Open Anki.</li>
        <li>Press Connect to Anki below.</li>
        <li>Once Anki asks whether to let easyImmerse use it, choose "Yes".</li>
      </ol>
      <p className="text-sm">
        After that, <b>keep Anki open as you use easyImmerse</b>, and an Anki
        card/note will be created for each new card you make in easyImmerse.
      </p>
    </ModalDialog>
  );
}
