import { actions, type MailedLinkView } from "@easyimmerse/state";
import { TextField } from "../../components/common/TextField.tsx";
import { useAppDispatch } from "../../useAppDispatch.ts";

/** The address of the server that mailed a link, which the person types when the app knows of no server. */
export function MailedLinkServerField({ link }: { link: MailedLinkView }) {
  const dispatch = useAppDispatch();
  if (!link.needsServerAddress) return null;
  return (
    <TextField
      label="Server address"
      type="url"
      placeholder="https://"
      hint="Enter the address of the server that sent the link."
      value={link.serverAddress}
      disabled={link.status === "sending" || link.status === "done"}
      onChange={(event) =>
        dispatch(
          actions.mailedLinkFormChanged({ serverAddress: event.target.value }),
        )
      }
    />
  );
}
