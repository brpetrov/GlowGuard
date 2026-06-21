import type { GlowGuardSettings } from "../types/settings";
import { STORAGE_KEY, DEFAULT_SETTINGS, SETTINGS_VERSION } from "./constants";

const api = (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;

function migrate(settings: GlowGuardSettings): GlowGuardSettings {
  const version = settings.settingsVersion || 0;

  if (version < SETTINGS_VERSION) {
    settings.settingsVersion = SETTINGS_VERSION;
  }

  return settings;
}

export async function getSettings(): Promise<GlowGuardSettings> {
  try {
    const result = await api.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      const settings = migrate({ ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] });
      return settings;
    }
    return { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(
  settings: Partial<GlowGuardSettings>
): Promise<void> {
  try {
    const current = await getSettings();
    const merged = { ...current, ...settings };
    await api.storage.local.set({ [STORAGE_KEY]: merged });
  } catch {
    // Storage write failed — settings won't persist but extension keeps working
  }
}
