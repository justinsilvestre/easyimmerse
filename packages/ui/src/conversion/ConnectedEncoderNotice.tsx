import {
  actions,
  selectBundledServerPlatform,
  selectPreference,
  selectPreferencesLoaded,
} from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useConversionCapabilities } from "../hooks/useConversionCapabilities.ts";
import { EncoderNoticeDialog } from "./EncoderNoticeDialog.tsx";
import { isEncoderNoticeDue } from "./isEncoderNoticeDue.ts";

/**
 * Shows the desktop app's notice that no video encoder works, until the person puts it aside.
 * Opening the media conversion settings from it puts it aside too, since the settings say the same and more.
 */
export function ConnectedEncoderNotice() {
  const dispatch = useAppDispatch();
  const isDesktop = useAppSelector(selectBundledServerPlatform) === "desktop";
  const { data: capabilities } = useConversionCapabilities(!isDesktop);
  const isDismissed =
    useAppSelector(selectPreference("encoderNoticeDismissed")) === "true";
  const arePreferencesLoaded = useAppSelector(selectPreferencesLoaded);
  if (!isEncoderNoticeDue({ capabilities, isDismissed, arePreferencesLoaded }))
    return null;
  const dismiss = () =>
    dispatch(actions.preferenceSet("encoderNoticeDismissed", "true"));
  return (
    <EncoderNoticeDialog
      onDismiss={dismiss}
      onOpenSettings={() => {
        dismiss();
        dispatch(actions.navigated({ type: "openMediaConversionSettings" }));
      }}
    />
  );
}
