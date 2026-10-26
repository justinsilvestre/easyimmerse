import {
  type DesktopPairingServer,
  selectBundledServerPlatform,
} from "@easyimmerse/state";
import { ScreenLayout } from "../../layout/ScreenLayout.tsx";
import { selectSettingsPageBackLabel } from "../../selectSettingsPageBackLabel.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { ConnectedDesktopPairingPanel } from "./ConnectedDesktopPairingPanel.tsx";
import { PairingScannerPanel } from "./PairingScannerPanel.tsx";

/**
 * The Local network sync page of Settings: on the desktop app, what another device needs to pair with it;
 * in the web and mobile apps, the way to pair with a desktop app.
 * The desktop server's state comes from the caller; null means it is not known yet.
 */
export function PairingScreen({
  backHref,
  desktopServer,
  onStartDesktopServer,
}: {
  backHref: string;
  desktopServer: DesktopPairingServer | null;
  onStartDesktopServer: () => void;
}) {
  const isDesktop = useAppSelector(selectBundledServerPlatform) === "desktop";
  return (
    <ScreenLayout
      backHref={backHref}
      backLabel={useAppSelector(selectSettingsPageBackLabel)}
    >
      <h1 className="text-xl font-semibold">Local network sync</h1>
      {isDesktop ? (
        <ConnectedDesktopPairingPanel
          server={desktopServer}
          onStartServer={onStartDesktopServer}
        />
      ) : (
        <PairingScannerPanel />
      )}
    </ScreenLayout>
  );
}
