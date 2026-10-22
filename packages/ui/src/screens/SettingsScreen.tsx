import {
  selectBundledServerPlatform,
  selectSettingsScrollTarget,
} from "@easyimmerse/state";
import { BookOpen, ChevronRight } from "lucide-react";
import { AccountSection } from "../account/AccountSection.tsx";
import type { ConversionCacheControls } from "../components/ConversionCacheSection.tsx";
import { ConversionCacheSection } from "../components/ConversionCacheSection.tsx";
import {
  type LicenseNoticesState,
  LicensesPage,
} from "../components/LicensesPage.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import type { FfmpegBuildControls } from "../conversion/FfmpegBuildBlock.tsx";
import { MediaConversionSection } from "../conversion/MediaConversionSection.tsx";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { SubtitleAppearanceSection } from "../media/SubtitleAppearanceSection.tsx";
import { accountSectionId } from "../server/ServerAccountsInfo.tsx";
import { ServerSection } from "../server/ServerSection.tsx";

const unavailableConversionCache: ConversionCacheControls = {
  cache: { kind: "unavailable" },
  onClear: () => undefined,
  clearStatus: "",
  onBudgetChange: () => undefined,
};

export function SettingsScreen({
  onBack,
  onOpenDictionaries,
  conversionCache = unavailableConversionCache,
  ffmpegBuild = null,
  licenseNotices = { status: "loaded", groups: [] },
}: {
  /** Closes Settings to the screen beneath, whichever it is, so its button says only Back. */
  onBack: () => void;
  onOpenDictionaries: () => void;
  conversionCache?: ConversionCacheControls;
  /** The desktop app's ffmpeg build, or null where the app has none to choose. */
  ffmpegBuild?: FfmpegBuildControls | null;
  licenseNotices?: LicenseNoticesState;
}) {
  const isDesktop = useAppSelector(selectBundledServerPlatform) === "desktop";
  const scrollTarget = useAppSelector(selectSettingsScrollTarget);
  return (
    <ScreenLayout onBack={onBack}>
      <h1 className="text-xl font-semibold">Settings</h1>
      <div id={accountSectionId} className="scroll-mt-4">
        <AccountSection />
      </div>
      {isDesktop && <ServerSection />}
      <button
        type="button"
        onClick={onOpenDictionaries}
        className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
      >
        <BookOpen className="size-4 text-fg-muted" aria-hidden />
        <span className="flex flex-1 flex-col">
          <span className="font-medium">Dictionaries</span>
          <span className="text-sm text-fg-muted">
            Add and remove the dictionaries words are looked up in.
          </span>
        </span>
        <ChevronRight className="size-4 text-fg-muted" aria-hidden />
      </button>
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
