import {
  actions,
  selectBundledServerPlatform,
  selectPairingForm,
} from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { browserCanScan } from "./browserCanScan.ts";
import { PairingScannerForm } from "./PairingScannerForm.tsx";
import { QrCameraView } from "./QrCameraView.tsx";

/**
 * The pairing panel of the web and mobile apps, backed by the store.
 * The mobile app scans through its own scanner; a browser through its camera, where it can.
 */
export function PairingScannerPanel() {
  const dispatch = useAppDispatch();
  const form = useAppSelector(selectPairingForm);
  const isMobileApp = useAppSelector(selectBundledServerPlatform) === "mobile";
  return (
    <PairingScannerForm
      form={form}
      canScan={isMobileApp || browserCanScan(globalThis)}
      camera={
        isMobileApp ? undefined : (
          <QrCameraView
            onScanned={(text) => dispatch(actions.pairingCodeScanned(text))}
            onCancel={() => dispatch(actions.pairingScanCancelled())}
          />
        )
      }
      onChange={(changes) => dispatch(actions.pairingFormChanged(changes))}
      onSubmit={() => dispatch(actions.pairingSubmitted())}
      onScan={() => dispatch(actions.pairingScanRequested())}
    />
  );
}
