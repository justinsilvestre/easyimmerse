import { usersPageSize } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { Button } from "../../components/common/Button.tsx";
import { useAppDispatch } from "../../useAppDispatch.ts";

/** The buttons that turn to the previous or next page of accounts, shown once the matching accounts fill more than one page. */
export function UsersPager({ page, total }: { page: number; total: number }) {
  const dispatch = useAppDispatch();
  if (page === 0 && total <= usersPageSize) return null;
  return (
    <nav aria-label="Pages of accounts" className="flex gap-2">
      <Button
        size="sm"
        disabled={page === 0}
        onClick={() => dispatch(actions.userPageChanged(page - 1))}
      >
        Previous page
      </Button>
      <Button
        size="sm"
        disabled={(page + 1) * usersPageSize >= total}
        onClick={() => dispatch(actions.userPageChanged(page + 1))}
      >
        Next page
      </Button>
    </nav>
  );
}
