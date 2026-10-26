import { type AccountVia, selectPathOfStep } from "@easyimmerse/state";
import { ButtonLink } from "../../components/common/Button.tsx";
import { useAppSelector } from "../../useAppSelector.ts";

/** Opens the Users page, where a server admin manages the accounts of the server that `via` names. */
export function ManageUsersButton({
  via,
  serverName,
}: {
  via: AccountVia;
  serverName: string;
}) {
  const href = useAppSelector((state) =>
    selectPathOfStep(state, { type: "openUsers", via }),
  );
  return (
    <div className="flex flex-col items-start gap-1">
      <ButtonLink href={href}>Manage users</ButtonLink>
      <p className="text-xs text-fg-muted">
        {`Create accounts on ${serverName}, choose what each one can do, and delete them.`}
      </p>
    </div>
  );
}
