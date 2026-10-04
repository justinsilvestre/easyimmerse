import { ArrowLeft } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";

/** A screen whose content is still loading or could not be loaded, with the way back. */
export function ScreenMessage({
  status,
  message,
  onBack,
}: {
  status: "loading" | "failed";
  message: string;
  onBack: () => void;
}) {
  return (
    <ScreenLayout
      headerActions={
        <Button variant="subtle" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Button>
      }
    >
      {status === "loading" ? (
        <p className="text-sm text-fg-muted">{message}</p>
      ) : (
        <p role="alert">{message}</p>
      )}
    </ScreenLayout>
  );
}
