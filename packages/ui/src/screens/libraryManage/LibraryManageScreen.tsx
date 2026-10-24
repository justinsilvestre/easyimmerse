import {
  buildLibraryCoverUrl,
  useListLibraryItemsQuery,
} from "@easyimmerse/backend";
import {
  actions,
  selectLibraryEdit,
  selectServerConfig,
} from "@easyimmerse/state";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { useNavigate } from "../../useNavigate.ts";
import { LibraryManagementView } from "./LibraryManagementView.tsx";
import { useLibraryItemCreation } from "./useLibraryItemCreation.ts";

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
      coverUrlOf={(item) => buildLibraryCoverUrl(server, item)}
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
