import { BookOpen, ChevronRight } from "lucide-react";
import type { ConversionCacheControls } from "../components/ConversionCacheSection.tsx";
import { ConversionCacheSection } from "../components/ConversionCacheSection.tsx";
import {
  type LicenseNoticesState,
  LicensesPage,
} from "../components/LicensesPage.tsx";
import { PreferenceToggle } from "../components/PreferenceToggle.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { SubtitleAppearanceSection } from "../media/SubtitleAppearanceSection.tsx";

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
  licenseNotices = { status: "loaded", groups: [] },
}: {
  /** Closes Settings to the screen beneath, whichever it is, so its button says only Back. */
  onBack: () => void;
  onOpenDictionaries: () => void;
  conversionCache?: ConversionCacheControls;
  licenseNotices?: LicenseNoticesState;
}) {
  return (
    <ScreenLayout onBack={onBack}>
      <h1 className="text-xl font-semibold">Settings</h1>
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
      <section
        aria-labelledby="settings-conversion"
        className="flex flex-col gap-3"
      >
        <h2 id="settings-conversion" className="text-base font-semibold">
          Conversion
        </h2>
        <PreferenceToggle
          preferenceKey="losslessAudio"
          label="Keep audio lossless when converting"
          hint="Converted audio keeps its full quality but takes more disk space."
        />
      </section>
      <ConversionCacheSection {...conversionCache} />
      <LicensesPage notices={licenseNotices} />
    </ScreenLayout>
  );
}
