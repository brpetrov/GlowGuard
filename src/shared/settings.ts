import type { GlowGuardSettings } from "../types/settings";
import { STORAGE_KEY, DEFAULT_SETTINGS } from "./constants";

const api = (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;

export async function getSettings(): Promise<GlowGuardSettings> {
  try {
    const result = await api.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
    }
    return { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(
  settings: Partial<GlowGuardSettings>
): Promise<void> {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  await api.storage.local.set({ [STORAGE_KEY]: merged });
}
