import { useGetConversionCacheStatusQuery } from "@easyimmerse/backend";
import { actions, selectConversionCacheReport } from "@easyimmerse/state";
import type { ConversionCacheControls } from "../components/ConversionCacheSection.tsx";
import { conversionCacheViewOf } from "../components/conversionCacheViewOf.ts";
import { useAppDispatch } from "./useAppDispatch.ts";
import { useAppSelector } from "./useAppSelector.ts";

/** Reads the media cache's disk usage, clears it on request, and sets how large it may grow. */
export function useConversionCacheControls(): ConversionCacheControls {
  const dispatch = useAppDispatch();
  const { data, error } = useGetConversionCacheStatusQuery();
  return {
    cache: conversionCacheViewOf(data, error),
    clearStatus: useAppSelector(selectConversionCacheReport),
    onClear: () => dispatch(actions.conversionCacheClearRequested()),
    onBudgetChange: (budgetBytes) =>
      dispatch(actions.conversionCacheBudgetChosen(budgetBytes)),
  };
}
