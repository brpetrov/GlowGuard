import { getSettings, saveSettings } from "../shared/settings";
import { STORAGE_KEY } from "../shared/constants";
import { getNextPeriodChange } from "../shared/schedule";

const ALARM_NAME = "glowguard-period";

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await saveSettings(settings);
  if (settings.automatic) scheduleNextAlarm();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const settings = await getSettings();
  if (!settings.automatic) return;

  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  scheduleNextAlarm();
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local" || !changes[STORAGE_KEY]) return;
  const settings = await getSettings();
  if (settings.automatic) {
    scheduleNextAlarm();
  } else {
    chrome.alarms.clear(ALARM_NAME);
  }
});

async function scheduleNextAlarm(): Promise<void> {
  const settings = await getSettings();
  const next = getNextPeriodChange(new Date(), settings.schedule);
  chrome.alarms.create(ALARM_NAME, { when: next.getTime() });
}
