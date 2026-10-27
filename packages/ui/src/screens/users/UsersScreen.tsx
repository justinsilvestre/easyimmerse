import type { AccountVia } from "@easyimmerse/state";
import { ScreenLayout } from "../../layout/ScreenLayout.tsx";
import { selectSettingsPageBackLabel } from "../../selectSettingsPageBackLabel.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { NewUserForm } from "./NewUserForm.tsx";
import { UserList } from "./UserList.tsx";
import { UsersServerLine } from "./UsersServerLine.tsx";

/** The accounts of the server that `via` names, for its administrator to create, search, give access to, and delete. */
export function UsersScreen({
  via,
  backHref,
}: {
  via: AccountVia;
  backHref: string;
}) {
  return (
    <ScreenLayout
      backHref={backHref}
      backLabel={useAppSelector(selectSettingsPageBackLabel)}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Users</h1>
          <UsersServerLine via={via} />
        </div>
        <NewUserForm via={via} />
        <UserList via={via} />
      </div>
    </ScreenLayout>
  );
}
