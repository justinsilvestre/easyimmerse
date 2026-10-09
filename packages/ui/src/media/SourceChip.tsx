import { Button } from "../components/Button.tsx";

/**
 * A small button naming the plugin a media file was imported through, which opens the plugin's media interface.
 * When the plugin is no longer installed, the button is unavailable and says so in its tooltip.
 */
export function SourceChip({
  source,
  onOpen,
}: {
  source: { title: string; isAvailable: boolean };
  onOpen?: () => void;
}) {
  return (
    <Button
      size="sm"
      className="shrink-0 rounded-full"
      aria-disabled={!source.isAvailable}
      title={
        source.isAvailable
          ? `Open ${source.title}`
          : `The plugin “${source.title}” is not installed`
      }
      onClick={() => {
        if (source.isAvailable) onOpen?.();
      }}
    >
      {source.title}
    </Button>
  );
}
