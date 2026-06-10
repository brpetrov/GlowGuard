import { getSettings } from "../shared/settings";
import { STORAGE_KEY } from "../shared/constants";
import { warmthLevelToPreset, WARMTH_PRESETS } from "../shared/warmth";
import { getAutomaticLevels } from "../shared/schedule";
import { isPageBright } from "../shared/brightness";

const DIM_ID = "glowguard-overlay";
const WARMTH_ID = "glowguard-warmth";

const api = (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;

const OVERLAY_CSS =
  "position:fixed;inset:0;z-index:2147483647;pointer-events:none;" +
  "transition:opacity 0.3s ease;";

function getOrCreate(id: string): HTMLDivElement {
  let el = document.getElementById(id) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.style.cssText = OVERLAY_CSS;
    document.documentElement.appendChild(el);
  }
  return el;
}

async function applyOverlay(): Promise<void> {
  const settings = await getSettings();
  const dimEl = getOrCreate(DIM_ID);
  const warmthEl = getOrCreate(WARMTH_ID);

  if (!settings.enabled) {
    dimEl.style.opacity = "0";
    warmthEl.style.opacity = "0";
    return;
  }

  let dimLevel: number;
  let warmthLevel: number;

  if (settings.automatic) {
    const auto = getAutomaticLevels(new Date(), settings.schedule);
    dimLevel = auto.dimLevel;
    warmthLevel = auto.warmthLevel;

    if (isPageBright() && settings.brightBoost.enabled) {
      dimLevel = Math.min(dimLevel + settings.brightBoost.extraDim, 40);
    }
  } else {
    dimLevel = settings.dimLevel;
    warmthLevel = settings.warmthLevel;
  }

  const dimFraction = dimLevel / 100;
  dimEl.style.background = `rgba(0, 0, 0, ${dimFraction})`;
  dimEl.style.opacity = "1";

  const preset = warmthLevelToPreset(warmthLevel);
  const warmthColor = WARMTH_PRESETS[preset].color;
  warmthEl.style.background = warmthColor;
  warmthEl.style.opacity = preset !== "off" ? "1" : "0";
}

applyOverlay();

api.storage.onChanged.addListener((changes: Record<string, chrome.storage.StorageChange>, area: string) => {
  if (area === "local" && changes[STORAGE_KEY]) {
    applyOverlay();
  }
});
