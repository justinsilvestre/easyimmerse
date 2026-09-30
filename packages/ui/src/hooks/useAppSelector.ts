import type { RootState } from "@easyimmerse/state";
import { useSelector } from "react-redux";

export const useAppSelector = useSelector.withTypes<RootState>();
