import { AccountSection } from "../account/AccountSection.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";

/** The Account page of Settings, where the app logs in to an account or shows the one it is logged in to. */
export function AccountScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenLayout onBack={onBack}>
      <AccountSection />
    </ScreenLayout>
  );
}
