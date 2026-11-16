import Svg, { Circle, Path } from 'react-native-svg';

/** Thin stroke icons used across the app (same drawing as the design canvas). */
export type IconName = 'close' | 'undo' | 'speaker' | 'chevronLeft' | 'chevronRight' | 'clock';

const PATHS: Record<IconName, string[]> = {
  close: ['M6 6l12 12', 'M18 6L6 18'],
  undo: ['M9 14L4 9l5-5', 'M4 9h10a6 6 0 010 12h-3'],
  speaker: ['M11 5L6 9H3v6h3l5 4V5z', 'M15.5 8.5a5 5 0 010 7'],
  chevronLeft: ['M15 6l-6 6 6 6'],
  chevronRight: ['M9 6l6 6-6 6'],
  clock: ['M12 9v4l2 2', 'M10 2h4'],
};

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {name === 'clock' ? <Circle cx={12} cy={13} r={8} /> : null}
      {PATHS[name].map((d) => (
        <Path key={d} d={d} />
      ))}
    </Svg>
  );
}
