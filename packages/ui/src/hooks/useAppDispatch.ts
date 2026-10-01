import type { AppDispatch } from "@easyimmerse/state";
import { useDispatch } from "react-redux";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
