import { Button } from "../components/Button.tsx";
import type { ConversionCacheStatus } from "../components/ConversionCacheSection.tsx";
import { ConversionCacheSection } from "../components/ConversionCacheSection.tsx";
import type { LicenseNotice } from "../components/LicensesPage.tsx";
import { LicensesPage } from "../components/LicensesPage.tsx";
import { LosslessAudioToggle } from "../components/LosslessAudioToggle.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";

/** What the Settings screen shows about converted videos, and how it clears them. */
export type ConversionCacheControls = {
  status: ConversionCacheStatus | null;
  onClear: () => void;
  clearStatus: string;
};

const unavailableConversionCache: ConversionCacheControls = {
  status: null,
  onClear: () => undefined,
  clearStatus: "",
};

export function SettingsScreen({
  onBack,
  conversionCache = unavailableConversionCache,
  licenseNotices = [],
}: {
  onBack: () => void;
  conversionCache?: ConversionCacheControls;
  licenseNotices?: readonly LicenseNotice[];
}) {
  return (
    <ScreenLayout
      headerActions={<Button onClick={onBack}>Back</Button>}
      showSettingsLink={false}
    >
      <h1 className="text-xl font-semibold">Settings</h1>
      <section
        aria-labelledby="settings-conversion"
        className="flex flex-col gap-3"
      >
        <h2 id="settings-conversion" className="text-base font-semibold">
          Conversion
        </h2>
        <LosslessAudioToggle />
      </section>
      <ConversionCacheSection
        status={conversionCache.status}
        onClear={conversionCache.onClear}
        clearStatus={conversionCache.clearStatus}
      />
      <LicensesPage notices={licenseNotices} />
    </ScreenLayout>
  );
}
