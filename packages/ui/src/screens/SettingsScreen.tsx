import { Button } from "../components/Button.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenLayout
      headerActions={<Button onClick={onBack}>Back</Button>}
      showSettingsLink={false}
    >
      <h1 className="text-xl font-semibold">Settings</h1>
    </ScreenLayout>
  );
}
