import {
  selectBundledServerPlatform,
  selectSettingsScrollTarget,
} from "@easyimmerse/state";
import { BookOpen, UserRound } from "lucide-react";
import { CloudStorageSection } from "../account/CloudStorageSection.tsx";
import { selectLoginState } from "../account/selectLoginState.ts";
import type { ConversionCacheControls } from "../components/ConversionCacheSection.tsx";
import { ConversionCacheSection } from "../components/ConversionCacheSection.tsx";
import {
  type LicenseNoticesState,
  LicensesPage,
} from "../components/LicensesPage.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { SettingsPageButton } from "../components/SettingsPageButton.tsx";
import type { FfmpegBuildControls } from "../conversion/FfmpegBuildBlock.tsx";
import { MediaConversionSection } from "../conversion/MediaConversionSection.tsx";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { SubtitleAppearanceSection } from "../media/SubtitleAppearanceSection.tsx";
import { ServerSection } from "../server/ServerSection.tsx";

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
  const isDesktop = useAppSelector(selectBundledServerPlatform) === "desktop";
  const scrollTarget = useAppSelector(selectSettingsScrollTarget);
  const loginState = useAppSelector(selectLoginState);
  return (
    <ScreenLayout onBack={onBack}>
      <h1 className="text-xl font-semibold">Settings</h1>
      <SettingsPageButton
        icon={<UserRound className="size-4 text-fg-muted" aria-hidden />}
        label="Account"
        description={accountDescriptions[loginState]}
        onClick={onOpenAccount}
      />
      <CloudStorageSection />
      {isDesktop && <ServerSection />}
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
      <LicensesPage notices={licenseNotices} />
    </ScreenLayout>
  );
}
