import { type AccountVia, actions } from "@easyimmerse/state";
import { Button } from "../../components/common/Button.tsx";
import { useAppDispatch } from "../../useAppDispatch.ts";

/** Opens the Users page, where a server admin manages the accounts of the server that `via` names. */
export function ManageUsersButton({
  via,
  serverName,
}: {
  via: AccountVia;
  serverName: string;
}) {
  const dispatch = useAppDispatch();
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        onClick={() => dispatch(actions.navigated({ type: "openUsers", via }))}
      >
        Manage users
      </Button>
      <p className="text-xs text-fg-muted">
        {`Create accounts on ${serverName}, choose what each one can do, and delete them.`}
      </p>
    </div>
  );
}
