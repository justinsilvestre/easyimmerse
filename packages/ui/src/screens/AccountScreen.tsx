import { AccountSection } from "../account/AccountSection.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { selectSettingsPageBackLabel } from "./selectSettingsPageBackLabel.ts";

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
