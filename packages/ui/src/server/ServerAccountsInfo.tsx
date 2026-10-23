import { actions } from "@easyimmerse/state";
import { LinkButton } from "../components/LinkButton.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";

const roles = [
  {
    name: "Library user",
    description:
      "can access your library, sync projects, and sync their flashcards.",
  },
  {
    name: "Privileged user",
    description:
      "can also sync projects, flashcards, and dictionaries, and access services like translation.",
  },
  {
    name: "Administrator",
    description:
      "can also manage the server, user accounts, your library, dictionaries available to users, and services like translation available to users.",
  },
] as const;

/**
 * Explains the roles an account can have on a server with accounts, and points to the Account page, where accounts are created and managed.
 * Before the change to accounts is saved, it says that the accounts come after saving.
 */
export function ServerAccountsInfo({ isSaved }: { isSaved: boolean }) {
  const dispatch = useAppDispatch();
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        {isSaved
          ? "People log in to this server with an account. "
          : "Once you save, people log in to this server with an account. "}
        Accounts are created and managed on the{" "}
        <LinkButton
          onClick={() =>
            dispatch(actions.navigated({ type: "openAccountSettings" }))
          }
        >
          Account page
        </LinkButton>
        , where each account gets one of these roles:
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {roles.map((role) => (
          <li key={role.name}>
            <span className="font-medium">{role.name}</span>: {role.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
