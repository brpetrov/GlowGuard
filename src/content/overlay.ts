import { getSettings } from "../shared/settings";
import { STORAGE_KEY } from "../shared/constants";
import { warmthLevelToPreset, WARMTH_PRESETS } from "../shared/warmth";
import { getAutomaticLevels } from "../shared/schedule";
import { isPageBright } from "../shared/brightness";
import { buildAccessibilityCss } from "../shared/a11y-styles";

const DIM_ID = "glowguard-overlay";
const WARMTH_ID = "glowguard-warmth";
const A11Y_STYLE_ID = "glowguard-a11y";

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

function getOrCreateA11yStyle(): HTMLStyleElement {
  let el = document.getElementById(A11Y_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = A11Y_STYLE_ID;
    document.documentElement.appendChild(el);
  }
  return el;
}

async function applyOverlay(): Promise<void> {
  const settings = await getSettings();
  const dimEl = getOrCreate(DIM_ID);
  const warmthEl = getOrCreate(WARMTH_ID);
  const a11yStyle = getOrCreateA11yStyle();

  if (!settings.enabled) {
    dimEl.style.opacity = "0";
    warmthEl.style.opacity = "0";
    a11yStyle.textContent = "";
    return;
  }

  a11yStyle.textContent = buildAccessibilityCss(settings.accessibility);

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

api.runtime.onMessage.addListener((message: { type?: string; text?: string }) => {
  if (message.type === "glowguard-toast" && message.text) {
    showToast(message.text);
  }
});

function showToast(text: string): void {
  const TOAST_ID = "glowguard-toast";
  let toast = document.getElementById(TOAST_ID);
  if (toast) toast.remove();

  toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.textContent = text;
  toast.style.cssText =
    "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);" +
    "padding:8px 16px;background:rgba(30,30,50,0.9);color:#e0e0e0;" +
    "font:13px system-ui,sans-serif;border-radius:8px;z-index:2147483647;" +
    "pointer-events:none;opacity:1;transition:opacity 0.4s ease;";
  document.documentElement.appendChild(toast);

  setTimeout(() => { toast!.style.opacity = "0"; }, 1500);
  setTimeout(() => { toast!.remove(); }, 2000);
}
