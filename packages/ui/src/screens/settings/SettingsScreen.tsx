import {
  selectBundledServerPlatform,
  selectPathOfStep,
  selectSettingsScrollTarget,
} from "@easyimmerse/state";
import { BookOpen, Server, UserRound, Wifi } from "lucide-react";
import { ScreenLayout } from "../../layout/ScreenLayout.tsx";
import { selectLoginState } from "../../lib/sync/selectLoginState.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { CloudStorageSection } from "./CloudStorageSection.tsx";
import type { ConversionCacheControls } from "./ConversionCacheSection.tsx";
import { ConversionCacheSection } from "./ConversionCacheSection.tsx";
import { DisplaySection } from "./DisplaySection.tsx";
import type { FfmpegBuildControls } from "./FfmpegBuildBlock.tsx";
import { HelpRow } from "./HelpRow.tsx";
import { type LicenseNoticesState, LicensesPage } from "./LicensesPage.tsx";
import { MediaConversionSection } from "./MediaConversionSection.tsx";
import { SettingsGroup } from "./SettingsGroup.tsx";
import { SettingsPageButton } from "./SettingsPageButton.tsx";
import { SubtitleAppearanceSection } from "./SubtitleAppearanceSection.tsx";
import { SuggestionsSection } from "./SuggestionsSection.tsx";

const unavailableConversionCache: ConversionCacheControls = {
  cache: { kind: "unavailable" },
  onClear: () => undefined,
  clearStatus: "",
  onBudgetChange: () => undefined,
};

const accountDescriptions = {
  loggedIn: "The account you are logged in to, and the devices it is used on.",
  loggedOut:
    "You are not logged in. Log in or sign up to back up your work and use it on your other devices.",
  unknown: "Log in to an account, or see the one you are logged in to.",
};

const localNetworkSyncDescriptions = {
  desktop: "Pair your other devices on this network with this computer.",
  elsewhere:
    "Pair this device with the easyImmerse desktop app on a computer on this network.",
};

export function SettingsScreen({
  backHref,
  conversionCache = unavailableConversionCache,
  ffmpegBuild = null,
  licenseNotices = { status: "loaded", groups: [] },
}: {
  /** The path of the screen beneath Settings, whichever it is, so its link says only Back. */
  backHref: string;
  conversionCache?: ConversionCacheControls;
  /** The desktop app's ffmpeg build, or null where the app has none to choose. */
  ffmpegBuild?: FfmpegBuildControls | null;
  licenseNotices?: LicenseNoticesState;
}) {
  const isDesktop = useAppSelector(selectBundledServerPlatform) === "desktop";
  const scrollTarget = useAppSelector(selectSettingsScrollTarget);
  const loginState = useAppSelector(selectLoginState);
  const accountHref = useAppSelector((state) =>
    selectPathOfStep(state, { type: "openAccountSettings" }),
  );
  const pairingHref = useAppSelector((state) =>
    selectPathOfStep(state, { type: "openPairing" }),
  );
  const serverHref = useAppSelector((state) =>
    selectPathOfStep(state, { type: "openServerSettings" }),
  );
  const dictionariesHref = useAppSelector((state) =>
    selectPathOfStep(state, { type: "openDictionaries" }),
  );
  return (
    <ScreenLayout backHref={backHref}>
      <h1 className="text-xl font-semibold">Settings</h1>
      <SettingsGroup title="Sync">
        <SettingsPageButton
          icon={<UserRound className="size-4 text-fg-muted" aria-hidden />}
          label="Account"
          description={accountDescriptions[loginState]}
          href={accountHref}
        />
        <SettingsPageButton
          icon={<Wifi className="size-4 text-fg-muted" aria-hidden />}
          label="Local network sync"
          description={
            localNetworkSyncDescriptions[isDesktop ? "desktop" : "elsewhere"]
          }
          href={pairingHref}
        />
        {isDesktop && (
          <SettingsPageButton
            icon={<Server className="size-4 text-fg-muted" aria-hidden />}
            label="Server"
            description="Start and stop the server other devices reach, name this computer, and choose who may sign in."
            href={serverHref}
          />
        )}
        <CloudStorageSection />
      </SettingsGroup>
      <SettingsGroup title="This device">
        <DisplaySection />
        <SettingsPageButton
          icon={<BookOpen className="size-4 text-fg-muted" aria-hidden />}
          label="Dictionaries"
          description="Add and remove the dictionaries words are looked up in."
          href={dictionariesHref}
        />
        <SubtitleAppearanceSection />
        <MediaConversionSection
          ffmpegBuild={ffmpegBuild}
          isScrollTarget={scrollTarget === "mediaConversion"}
        />
        <ConversionCacheSection {...conversionCache} />
        <SuggestionsSection />
      </SettingsGroup>
      <SettingsGroup title="About">
        <LicensesPage notices={licenseNotices} />
        <HelpRow />
      </SettingsGroup>
    </ScreenLayout>
  );
}
