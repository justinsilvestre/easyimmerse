import {
  actions,
  selectBundledServerPlatform,
  selectSettingsScrollTarget,
} from "@easyimmerse/state";
import { BookOpen, Server, UserRound, Wifi } from "lucide-react";
import { CloudStorageSection } from "../account/CloudStorageSection.tsx";
import { selectLoginState } from "../account/selectLoginState.ts";
import type { ConversionCacheControls } from "../components/ConversionCacheSection.tsx";
import { ConversionCacheSection } from "../components/ConversionCacheSection.tsx";
import { DisplaySection } from "../components/DisplaySection.tsx";
import { HelpRow } from "../components/HelpRow.tsx";
import {
  type LicenseNoticesState,
  LicensesPage,
} from "../components/LicensesPage.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { SettingsGroup } from "../components/SettingsGroup.tsx";
import { SettingsPageButton } from "../components/SettingsPageButton.tsx";
import { SuggestionsSection } from "../components/SuggestionsSection.tsx";
import type { FfmpegBuildControls } from "../conversion/FfmpegBuildBlock.tsx";
import { MediaConversionSection } from "../conversion/MediaConversionSection.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { SubtitleAppearanceSection } from "../media/SubtitleAppearanceSection.tsx";

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
  onBack,
  onOpenAccount,
  onOpenDictionaries,
  conversionCache = unavailableConversionCache,
  ffmpegBuild = null,
  licenseNotices = { status: "loaded", groups: [] },
}: {
  /** Closes Settings to the screen beneath, whichever it is, so its button says only Back. */
  onBack: () => void;
  onOpenAccount: () => void;
  onOpenDictionaries: () => void;
  conversionCache?: ConversionCacheControls;
  /** The desktop app's ffmpeg build, or null where the app has none to choose. */
  ffmpegBuild?: FfmpegBuildControls | null;
  licenseNotices?: LicenseNoticesState;
}) {
  const dispatch = useAppDispatch();
  const isDesktop = useAppSelector(selectBundledServerPlatform) === "desktop";
  const scrollTarget = useAppSelector(selectSettingsScrollTarget);
  const loginState = useAppSelector(selectLoginState);
  return (
    <ScreenLayout onBack={onBack}>
      <h1 className="text-xl font-semibold">Settings</h1>
      <SettingsGroup title="Sync">
        <SettingsPageButton
          icon={<UserRound className="size-4 text-fg-muted" aria-hidden />}
          label="Account"
          description={accountDescriptions[loginState]}
          onClick={onOpenAccount}
        />
        <SettingsPageButton
          icon={<Wifi className="size-4 text-fg-muted" aria-hidden />}
          label="Local network sync"
          description={
            localNetworkSyncDescriptions[isDesktop ? "desktop" : "elsewhere"]
          }
          onClick={() => dispatch(actions.navigated({ type: "openPairing" }))}
        />
        {isDesktop && (
          <SettingsPageButton
            icon={<Server className="size-4 text-fg-muted" aria-hidden />}
            label="Server"
            description="Start and stop the server other devices reach, name this computer, and choose who may sign in."
            onClick={() =>
              dispatch(actions.navigated({ type: "openServerSettings" }))
            }
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
          onClick={onOpenDictionaries}
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
