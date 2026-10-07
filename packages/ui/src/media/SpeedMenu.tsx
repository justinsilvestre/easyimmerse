import { MenuButton } from "../components/MenuButton.tsx";
import { formatSpeed } from "./formatSpeed.ts";

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** A button showing the playback speed, such as "1×", which opens a menu of the speeds to choose from. */
export function SpeedMenu({
  speed,
  onSpeedChange,
}: {
  speed: number;
  onSpeedChange: (speed: number) => void;
}) {
  const shownSpeed = formatSpeed(speed);
  return (
    <MenuButton
      label={`Playback speed: ${shownSpeed}`}
      badge={shownSpeed}
      opensUpward
      items={speeds.map((option) => ({
        label: formatSpeed(option),
        isSelected: option === speed,
        onSelect: () => onSpeedChange(option),
      }))}
    />
  );
}
