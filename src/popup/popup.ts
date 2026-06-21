import { getSettings, saveSettings } from "../shared/settings";
import { warmthLevelToPreset, WARMTH_LEVELS } from "../shared/warmth";
import { getAutomaticLevels } from "../shared/schedule";

const api = (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;

const restrictedMsg = document.getElementById("restricted-msg") as HTMLDivElement;
const mainControls = document.getElementById("main-controls") as HTMLDivElement;

function isRestrictedUrl(url: string): boolean {
  return /^(chrome|edge|about|chrome-extension|moz-extension):/.test(url)
    || url.includes("chrome.google.com/webstore")
    || url.includes("addons.mozilla.org");
}

api.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
  const url = tabs[0]?.url || "";
  if (isRestrictedUrl(url)) {
    restrictedMsg.classList.remove("hidden");
    mainControls.classList.add("hidden");
  }
});

const enabledToggle = document.getElementById("enabled-toggle") as HTMLInputElement;
const autoToggle = document.getElementById("auto-toggle") as HTMLInputElement;
const autoStatus = document.getElementById("auto-status") as HTMLSpanElement;
const manualControls = document.getElementById("manual-controls") as HTMLDivElement;
const dimSlider = document.getElementById("dim-slider") as HTMLInputElement;
const warmthBtns = document.querySelectorAll<HTMLButtonElement>(".warmth-btn");

function setActiveWarmthBtn(preset: string): void {
  warmthBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.warmth === preset);
  });
}

function updateAutoStatus(automatic: boolean): void {
  if (!automatic) {
    autoStatus.textContent = "";
    manualControls.classList.remove("disabled");
    return;
  }

  manualControls.classList.add("disabled");

  getSettings().then((settings) => {
    const auto = getAutomaticLevels(new Date(), settings.schedule);
    const period = auto.period.charAt(0).toUpperCase() + auto.period.slice(1);
    autoStatus.textContent = `${period} mode`;
  });
}

async function init(): Promise<void> {
  const settings = await getSettings();

  enabledToggle.checked = settings.enabled;
  autoToggle.checked = settings.automatic;
  dimSlider.value = String(settings.dimLevel);
  setActiveWarmthBtn(warmthLevelToPreset(settings.warmthLevel));
  updateAutoStatus(settings.automatic);

  enabledToggle.addEventListener("change", () => {
    saveSettings({ enabled: enabledToggle.checked });
  });

  autoToggle.addEventListener("change", () => {
    const automatic = autoToggle.checked;
    saveSettings({ automatic });
    updateAutoStatus(automatic);
  });

  dimSlider.addEventListener("input", () => {
    saveSettings({ dimLevel: Number(dimSlider.value) });
  });

  warmthBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = btn.dataset.warmth!;
      setActiveWarmthBtn(preset);
      saveSettings({ warmthLevel: WARMTH_LEVELS[preset] });
    });
  });
}

const autoInfoBtn = document.getElementById("auto-info-btn") as HTMLButtonElement;
const autoInfoPanel = document.getElementById("auto-info-panel") as HTMLDivElement;

autoInfoBtn.addEventListener("click", () => {
  autoInfoPanel.classList.toggle("hidden");
});

const shortcutsToggle = document.getElementById("shortcuts-toggle") as HTMLButtonElement;
const shortcutsPanel = document.getElementById("shortcuts-panel") as HTMLDivElement;
const shortcutsArrow = document.getElementById("shortcuts-arrow") as HTMLSpanElement;

shortcutsToggle.addEventListener("click", () => {
  shortcutsPanel.classList.toggle("hidden");
  shortcutsArrow.classList.toggle("open");
});

init();
