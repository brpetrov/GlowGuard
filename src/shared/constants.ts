import type { GlowGuardSettings } from "../types/settings";

export const STORAGE_KEY = "glowguard_settings";

export const DIM_MIN = 0;
export const DIM_MAX = 40;
export const WARMTH_MIN = 0;
export const WARMTH_MAX = 40;
export const DIM_STEP = 5;

export const DEFAULT_SETTINGS: GlowGuardSettings = {
  enabled: true,
  automatic: false,
  dimLevel: 10,
  warmthLevel: 0,
  schedule: {
    enabled: false,
    day: { dimLevel: 6, warmthLevel: 0 },
    evening: { dimLevel: 12, warmthLevel: 10 },
    night: { dimLevel: 20, warmthLevel: 15 },
    dayStart: "06:00",
    eveningStart: "18:00",
    nightStart: "22:00",
  },
  siteRules: [],
  brightBoost: {
    enabled: true,
    extraDim: 5,
  },
  antiFlash: {
    enabled: true,
    emergencyDim: 10,
  },
};
