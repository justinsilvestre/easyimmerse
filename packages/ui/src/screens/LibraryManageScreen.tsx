import {
  buildLibraryCoverUrl,
  useListLibraryItemsQuery,
} from "@easyimmerse/backend";
import {
  actions,
  selectLibraryEdit,
  selectServerConfig,
} from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useNavigate } from "../hooks/useNavigate.ts";
import { LibraryManagementView } from "../library/LibraryManagementView.tsx";
import { useLibraryItemCreation } from "../library/useLibraryItemCreation.ts";

/** The library management screen, which only library managers reach: every item, published or not, and the form for a new one. */
export function LibraryManageScreen() {
  const go = useNavigate();
  const dispatch = useAppDispatch();
  const upload = useAppSelector((state) => selectLibraryEdit(state).upload);
  const server = useAppSelector(selectServerConfig);
  const listing = useListLibraryItemsQuery();
  const edit = (itemId: string) => go({ type: "editLibraryItem", itemId });
  const creation = useLibraryItemCreation(edit);
  return (
    <LibraryManagementView
      status={listing.isError ? "failed" : listing.data ? "ready" : "loading"}
      items={listing.data?.items ?? []}
      coverUrlOf={(item) =>
        server && item.has_cover ? buildLibraryCoverUrl(server, item.id) : null
      }
      upload={upload}
      onChooseUpload={(chosen) => dispatch(actions.libraryUploadChosen(chosen))}
      isCreating={creation.isCreating}
      createFailure={creation.failure}
      onCreate={creation.create}
      onEditItem={edit}
      onBack={() => go({ type: "openLibrary" })}
    />
  );
}
