import { ScreenLayout } from "../../layout/ScreenLayout.tsx";
import { selectSettingsPageBackLabel } from "../../selectSettingsPageBackLabel.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { AccountSection } from "./AccountSection.tsx";

/** The account settings screen, where the app logs in to an account or shows the one it is logged in to. */
export function AccountScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenLayout
      onBack={onBack}
      backLabel={useAppSelector(selectSettingsPageBackLabel)}
    >
      <AccountSection />
    </ScreenLayout>
  );
}
