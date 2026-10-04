import type { LicenseNotice } from "@easyimmerse/licenses";
import { Button } from "../components/Button.tsx";
import type { ConversionCacheControls } from "../components/ConversionCacheSection.tsx";
import { ConversionCacheSection } from "../components/ConversionCacheSection.tsx";
import { LicensesPage } from "../components/LicensesPage.tsx";
import { PreferenceToggle } from "../components/PreferenceToggle.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";

const unavailableConversionCache: ConversionCacheControls = {
  cache: { kind: "unavailable" },
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
