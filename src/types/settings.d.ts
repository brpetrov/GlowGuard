export interface PeriodSettings {
  dimLevel: number;
  warmthLevel: number;
}

export interface ScheduleSettings {
  enabled: boolean;
  day: PeriodSettings;
  evening: PeriodSettings;
  night: PeriodSettings;
  dayStart: string;
  eveningStart: string;
  nightStart: string;
}

export interface SiteRule {
  pattern: string;
  enabled: boolean;
  dimLevel?: number;
  warmthLevel?: number;
}

export interface BrightBoostSettings {
  enabled: boolean;
  extraDim: number;
}

export interface AntiFlashSettings {
  enabled: boolean;
  emergencyDim: number;
}

export interface GlowGuardSettings {
  enabled: boolean;
  automatic: boolean;
  dimLevel: number;
  warmthLevel: number;
  schedule: ScheduleSettings;
  siteRules: SiteRule[];
  brightBoost: BrightBoostSettings;
  antiFlash: AntiFlashSettings;
}
