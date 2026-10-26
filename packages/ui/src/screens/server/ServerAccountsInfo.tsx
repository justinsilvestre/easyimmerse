import { selectPathOfStep } from "@easyimmerse/state";
import { TextLink } from "../../components/common/LinkButton.tsx";
import { useAppSelector } from "../../useAppSelector.ts";

const accesses = [
  {
    name: "Learner",
    description:
      "every account: can use your library, and sync their projects and flashcards.",
  },
  {
    name: "Full access",
    description:
      "lets a learner also sync dictionaries and use services like translation.",
  },
  {
    name: "Library admin",
    description: "lets an account also add to and edit your library.",
  },
  {
    name: "Server admin",
    description:
      "includes Full access and Library admin, and lets an account also manage the server, its accounts, the dictionaries available to users, and services like translation.",
  },
] as const;

/**
 * Explains what an account can do on a server with accounts, and points to the Users page, where accounts are created and managed.
 * Before the change to accounts is saved, it says that the accounts come after saving.
 */
export function ServerAccountsInfo({ isSaved }: { isSaved: boolean }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        {isSaved ? (
          <>
            People log in to this server with an account. Accounts are created
            and managed on the <UsersLink />
            {" page, where each can be given any of these:"}
          </>
        ) : (
          "Once you save, people log in to this server with an account, which can be given any of these:"
        )}
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {accesses.map((access) => (
          <li key={access.name}>
            <span className="font-medium">{access.name}</span>:{" "}
            {access.description}
          </li>
        ))}
      </ul>
    </div>
  );
}

function UsersLink() {
  const href = useAppSelector((state) =>
    selectPathOfStep(state, { type: "openUsers", via: "self" }),
  );
  return <TextLink href={href}>Users</TextLink>;
}
