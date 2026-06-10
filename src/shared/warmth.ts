export interface WarmthPreset {
  label: string;
  color: string;
}

export const WARMTH_PRESETS: Record<string, WarmthPreset> = {
  off:  { label: "Off",  color: "rgba(0, 0, 0, 0)" },
  soft: { label: "Soft", color: "rgba(200, 120, 40, 0.05)" },
  warm: { label: "Warm", color: "rgba(190, 90, 20, 0.11)" },
  deep: { label: "Deep", color: "rgba(160, 60, 10, 0.18)" },
};

export function warmthLevelToPreset(level: number): string {
  if (level === 0) return "off";
  if (level <= 10) return "soft";
  if (level <= 22) return "warm";
  return "deep";
}

export const WARMTH_LEVELS: Record<string, number> = {
  off: 0,
  soft: 8,
  warm: 18,
  deep: 30,
};
