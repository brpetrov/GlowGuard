import { getSettings, saveSettings } from '../shared/settings';
import { STORAGE_KEY, DIM_MAX, DIM_MIN, DIM_STEP } from '../shared/constants';
import { getNextPeriodChange } from '../shared/schedule';
import { warmthLevelToPreset, WARMTH_LEVELS } from '../shared/warmth';

const ALARM_NAME = 'glowguard-period';

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await saveSettings(settings);
  if (settings.automatic) scheduleNextAlarm();
});

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== ALARM_NAME) return;

  const settings = await getSettings();
  if (!settings.automatic) return;

  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  scheduleNextAlarm();
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local' || !changes[STORAGE_KEY]) return;
  const settings = await getSettings();
  if (settings.automatic) {
    scheduleNextAlarm();
  } else {
    chrome.alarms.clear(ALARM_NAME);
  }
});

chrome.commands.onCommand.addListener(async command => {
  const settings = await getSettings();

  if (command === 'toggle-glowguard') {
    await saveSettings({ enabled: !settings.enabled });
    return;
  }

  if (settings.automatic && command !== 'toggle-glowguard') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'glowguard-toast',
        text: 'Automatic mode is on — switch to manual to adjust',
      });
    }
    return;
  }

  if (command === 'dim-increase') {
    const newLevel = Math.min(settings.dimLevel + DIM_STEP, DIM_MAX);
    await saveSettings({ dimLevel: newLevel });
  } else if (command === 'dim-decrease') {
    const newLevel = Math.max(settings.dimLevel - DIM_STEP, DIM_MIN);
    await saveSettings({ dimLevel: newLevel });
  } else if (command === 'warmth-cycle') {
    const order = ['off', 'soft', 'warm', 'deep'] as const;
    const current = warmthLevelToPreset(
      settings.warmthLevel,
    ) as (typeof order)[number];
    const nextIndex = (order.indexOf(current) + 1) % order.length;
    await saveSettings({ warmthLevel: WARMTH_LEVELS[order[nextIndex]] });
  }
});

async function scheduleNextAlarm(): Promise<void> {
  const settings = await getSettings();
  const next = getNextPeriodChange(new Date(), settings.schedule);
  chrome.alarms.create(ALARM_NAME, { when: next.getTime() });
}
